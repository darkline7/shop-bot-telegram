import { Router } from 'express';
import { db, ok, fail, auth, roles, AuthRequest, audit } from './core';
import {
  AdminRole,
  DepositStatus,
  TransactionType,
  ItemStatus,
  OrderStatus,
  PaymentStatus,
  DeliveryStatus,
} from '@shop/database';
import crypto from 'node:crypto';
import { syncThueApiBank } from './bank';

export const businessRouter = Router();

// Định kỳ quét ThueApiBank mỗi 60s nếu có cấu hình
if (process.env.THUEAPIBANK_TOKEN || process.env.THUEAPIBANK_URL) {
  setInterval(() => {
    syncThueApiBank().catch(() => {});
  }, 60000);
}

// Cấu hình ngân hàng cho Bot & Web
businessRouter.get('/bank/config', async (_, res) => {
  return ok(res, {
    bankName: process.env.BANK_NAME || 'ACB',
    bankAccount: process.env.BANK_ACCOUNT || '6286861',
    accountName: process.env.BANK_ACCOUNT_NAME || 'TRAN TUAN PHONG',
    minDeposit: Number(process.env.DEPOSIT_MIN || 10000),
    maxDeposit: Number(process.env.DEPOSIT_MAX || 100000000),
    hasAutoBank: Boolean(process.env.THUEAPIBANK_TOKEN || process.env.THUEAPIBANK_URL),
    supportUsername: process.env.ADMIN_SUPPORT_USERNAME || 'admin_support',
  });
});

// Kích hoạt quét ngân hàng thủ công (Admin hoặc Bot)
businessRouter.post('/deposits/sync-bank', async (_, res) => {
  const result = await syncThueApiBank();
  return ok(res, result);
});

// Khách hàng bấm nút "Kiểm tra giao dịch" trên Bot
businessRouter.post('/deposits/check-user', async (req, res) => {
  const telegramId = String(req.body?.telegramId || '');
  if (!telegramId) return fail(res, 'INVALID_USER', 'telegramId required');

  await syncThueApiBank();

  const user = await db.user.findUnique({
    where: { telegramId },
    include: {
      deposits: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  return ok(res, {
    user,
    lastDeposit: user?.deposits?.[0] || null,
  });
});

businessRouter.post('/users/telegram', async (req, res) => {
  const b = req.body || {};
  if (!b.telegramId) return fail(res, 'INVALID_USER', 'telegramId required');
  const u = await db.user.upsert({
    where: { telegramId: String(b.telegramId) },
    update: {
      username: b.username,
      firstName: b.firstName,
      lastName: b.lastName,
      lastActiveAt: new Date(),
    },
    create: {
      telegramId: String(b.telegramId),
      username: b.username,
      firstName: b.firstName,
      lastName: b.lastName,
    },
  });
  return ok(res, u);
});

businessRouter.get('/users/by-telegram/:telegramId', async (req, res) => {
  const u = await db.user.findUnique({ where: { telegramId: String(req.params.telegramId) } });
  return u ? ok(res, u) : fail(res, 'USER_NOT_FOUND', 'User not found', 404);
});

businessRouter.get('/users/by-telegram/:telegramId/orders', async (req, res) =>
  ok(
    res,
    await db.order.findMany({
      where: { user: { telegramId: String(req.params.telegramId) } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        items: { include: { product: true } },
        productItems: true,
      },
    })
  )
);


businessRouter.get('/dashboard', auth, async (_, res) => {
  const [users, products, orders, deposits, revenue, availableStock] = await Promise.all([
    db.user.count(),
    db.product.count(),
    db.order.count(),
    db.deposit.aggregate({ where: { status: DepositStatus.COMPLETED }, _sum: { amount: true } }),
    db.transaction.aggregate({ where: { type: TransactionType.PURCHASE }, _sum: { amount: true } }),
    db.productItem.count({ where: { status: ItemStatus.AVAILABLE } }),
  ]);
  return ok(res, {
    users,
    products,
    orders,
    availableStock,
    totalDeposits: deposits._sum.amount || 0,
    revenue: revenue._sum.amount || 0,
  });
});

businessRouter.get('/orders', auth, async (_, res) =>
  ok(
    res,
    await db.order.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        items: { include: { product: true } },
        productItems: true,
      },
    })
  )
);

businessRouter.get('/users', auth, async (_, res) =>
  ok(
    res,
    await db.user.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { orders: true, deposits: true } },
      },
    })
  )
);

businessRouter.post('/users/:id/adjust-balance', auth, roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AuthRequest, res) => {
  const { amount, reason } = req.body || {};
  const num = Number(amount);
  if (!Number.isFinite(num) || num === 0) return fail(res, 'INVALID_AMOUNT', 'Số tiền điều chỉnh không hợp lệ');

  try {
    const result = await db.$transaction(async (tx) => {
      const u = await tx.user.findUniqueOrThrow({ where: { id: String(req.params.id) } });
      const before = Number(u.balance);
      const after = before + num;
      if (after < 0) throw new Error('NEGATIVE_BALANCE');

      const updated = await tx.user.update({
        where: { id: u.id },
        data: {
          balance: after,
          ...(num > 0 ? { totalDeposit: { increment: num } } : {}),
        },
      });

      await tx.transaction.create({
        data: {
          userId: u.id,
          type: num > 0 ? TransactionType.BONUS : TransactionType.ADMIN_ADJUSTMENT,
          amount: Math.abs(num),
          balanceBefore: before,
          balanceAfter: after,
          description: reason || (num > 0 ? 'Admin cộng tiền thủ công' : 'Admin trừ tiền thủ công'),
        },
      });

      return updated;
    });

    await audit(req, 'ADJUST_BALANCE', 'USER', String(req.params.id), { amount: num, reason });
    return ok(res, result);
  } catch (e: any) {
    return fail(res, 'ADJUST_FAILED', e.message === 'NEGATIVE_BALANCE' ? 'Số dư tài khoản không thể âm' : 'Lỗi điều chỉnh số dư');
  }
});

businessRouter.get('/deposits', auth, async (_, res) =>
  ok(
    res,
    await db.deposit.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    })
  )
);

businessRouter.post('/deposits/:id/approve', auth, roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AuthRequest, res) => {
  try {
    const d = await db.$transaction(async (tx) => {
      const dep = await tx.deposit.findUniqueOrThrow({ where: { id: String(req.params.id) } });
      if (dep.status !== DepositStatus.PENDING) throw Error();
      const u = await tx.user.findUniqueOrThrow({ where: { id: dep.userId } });
      const after = Number(u.balance) + Number(dep.amount);
      await tx.user.update({ where: { id: u.id }, data: { balance: after, totalDeposit: { increment: dep.amount } } });
      await tx.transaction.create({
        data: {
          userId: u.id,
          type: TransactionType.DEPOSIT,
          amount: dep.amount,
          balanceBefore: u.balance,
          balanceAfter: after,
          reference: `deposit:${dep.id}`,
          description: 'Duyệt nạp tiền thủ công',
        },
      });
      return tx.deposit.update({ where: { id: dep.id }, data: { status: DepositStatus.COMPLETED, completedAt: new Date() } });
    });
    await audit(req, 'APPROVE', 'DEPOSIT', d.id);
    return ok(res, d);
  } catch {
    return fail(res, 'DEPOSIT_INVALID', 'Giao dịch nạp không hợp lệ hoặc đã hoàn tất');
  }
});

businessRouter.post('/deposits/:id/reject', auth, roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AuthRequest, res) => {
  const d = await db.deposit.update({
    where: { id: String(req.params.id) },
    data: { status: DepositStatus.REJECTED, metadata: { reason: req.body?.reason || 'Admin từ chối' } },
  });
  await audit(req, 'REJECT', 'DEPOSIT', d.id);
  return ok(res, d);
});

businessRouter.post('/purchase', async (req, res) => {
  const { telegramId, productId, quantity = 1 } = req.body || {};
  try {
    const out = await db.$transaction(async (tx) => {
      const u = await tx.user.findUniqueOrThrow({ where: { telegramId } });
      const p = await tx.product.findUniqueOrThrow({ where: { id: productId } });
      const total = Number(p.salePrice ?? p.price) * quantity;
      if (Number(u.balance) < total) throw new Error('BALANCE');

      const items = await tx.productItem.findMany({
        where: { productId, status: ItemStatus.AVAILABLE },
        take: quantity,
        orderBy: { createdAt: 'asc' },
      });
      if (p.autoDelivery && items.length < quantity) throw new Error('STOCK');

      const code = `ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const o = await tx.order.create({
        data: {
          orderCode: code,
          userId: u.id,
          totalAmount: total,
          status: OrderStatus.COMPLETED,
          paymentStatus: PaymentStatus.PAID,
          deliveryStatus: p.autoDelivery ? DeliveryStatus.DELIVERED : DeliveryStatus.MANUAL,
          completedAt: new Date(),
          items: {
            create: {
              productId,
              quantity,
              price: Number(p.salePrice ?? p.price),
              subtotal: total,
            },
          },
        },
      });

      for (const i of items) {
        const x = await tx.productItem.updateMany({
          where: { id: i.id, status: ItemStatus.AVAILABLE },
          data: { status: ItemStatus.SOLD, orderId: o.id, soldAt: new Date() },
        });
        if (x.count !== 1) throw new Error('RACE');
      }

      await tx.product.update({ where: { id: productId }, data: { stock: { decrement: items.length } } });
      const after = Number(u.balance) - total;
      await tx.user.update({ where: { id: u.id }, data: { balance: after, totalSpent: { increment: total } } });
      await tx.transaction.create({
        data: {
          userId: u.id,
          type: TransactionType.PURCHASE,
          amount: total,
          balanceBefore: u.balance,
          balanceAfter: after,
          reference: `order:${o.id}`,
          orderId: o.id,
          description: `Mua ${p.name} (${code})`,
        },
      });

      return { order: o, delivery: items.map((i) => i.content), product: p };
    });

    return ok(res, out);
  } catch (e: any) {
    const m = e.message;
    return fail(
      res,
      m === 'BALANCE' ? 'INSUFFICIENT_BALANCE' : m === 'STOCK' ? 'OUT_OF_STOCK' : 'PURCHASE_FAILED',
      m === 'BALANCE' ? 'Số dư không đủ để mua sản phẩm' : m === 'STOCK' ? 'Sản phẩm đã hết hàng trong kho' : 'Giao dịch mua hàng thất bại',
      409
    );
  }
});

businessRouter.post('/deposits', async (req, res) => {
  const u = await db.user.findUnique({ where: { telegramId: String(req.body?.telegramId) } });
  const amount = Number(req.body?.amount);
  if (!u || !Number.isFinite(amount) || amount <= 0) return fail(res, 'INVALID_DEPOSIT', 'Yêu cầu nạp tiền không hợp lệ');

  const code = `DEP-${u.telegramId.slice(-4)}-${Date.now().toString(36).toUpperCase()}`;
  const dep = await db.deposit.create({
    data: {
      userId: u.id,
      amount,
      method: req.body.method || 'BANK_ACB',
      transactionCode: code,
    },
  });
  return ok(res, dep);
});

