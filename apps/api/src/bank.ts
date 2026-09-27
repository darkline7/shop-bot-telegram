import { db } from './core';
import { DepositStatus, TransactionType } from '@shop/database';

export async function syncThueApiBank() {
  const token = process.env.THUEAPIBANK_TOKEN;
  const customUrl = process.env.THUEAPIBANK_URL;
  const url = customUrl || (token ? `https://thueapibank.vn/historyapiacbv2/${token}` : null);

  if (!url) {
    return {
      success: false,
      configured: false,
      message: 'Chưa cấu hình THUEAPIBANK_TOKEN trong file .env',
      newCreditedCount: 0,
    };
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return {
        success: false,
        configured: true,
        message: `Lỗi kết nối ThueApiBank HTTP ${res.status}`,
        newCreditedCount: 0,
      };
    }

    const data: any = await res.json();
    const transactions = Array.isArray(data?.transactions) ? data.transactions : [];
    let newCreditedCount = 0;
    const creditedTransactions = [];

    for (const tx of transactions) {
      if (tx.type !== 'IN' || !tx.amount || Number(tx.amount) <= 0) continue;
      const txId = String(tx.transactionID);
      const reference = `bank:${txId}`;

      const existing = await db.transaction.findUnique({ where: { reference } });
      if (existing) continue;

      const desc = String(tx.description || '').toUpperCase();
      const amount = Number(tx.amount);

      let targetUser = null;
      let matchedDeposit = null;

      // 1. Tìm theo mã đơn nạp DEP-...
      const depMatch = desc.match(/DEP-[A-Z0-9_-]+/i) || desc.match(/DEP[A-Z0-9]+/i);
      if (depMatch) {
        const foundDep = await db.deposit.findFirst({
          where: {
            transactionCode: { equals: depMatch[0], mode: 'insensitive' },
            status: DepositStatus.PENDING,
          },
          include: { user: true },
        });
        if (foundDep) {
          matchedDeposit = foundDep;
          targetUser = foundDep.user;
        }
      }

      // 2. Tìm theo cú pháp NAP <telegramId> hoặc dãy số telegramId
      if (!targetUser) {
        const napMatch = desc.match(/(?:NAP|MMO|TG|SHOP|CK)\s*([0-9]{5,15})/i) || desc.match(/([0-9]{7,13})/);
        if (napMatch && napMatch[1]) {
          const candidateTgId = napMatch[1];
          const user = await db.user.findUnique({ where: { telegramId: candidateTgId } });
          if (user) {
            targetUser = user;
            matchedDeposit = await db.deposit.findFirst({
              where: { userId: user.id, status: DepositStatus.PENDING },
              orderBy: { createdAt: 'desc' },
            });
          }
        }
      }

      if (!targetUser) continue;

      try {
        await db.$transaction(async (txDb) => {
          const checkRef = await txDb.transaction.findUnique({ where: { reference } });
          if (checkRef) return;

          const u = await txDb.user.findUniqueOrThrow({ where: { id: targetUser.id } });
          const balanceBefore = Number(u.balance);
          const balanceAfter = balanceBefore + amount;

          await txDb.user.update({
            where: { id: u.id },
            data: {
              balance: balanceAfter,
              totalDeposit: { increment: amount },
              lastActiveAt: new Date(),
            },
          });

          if (matchedDeposit) {
            await txDb.deposit.update({
              where: { id: matchedDeposit.id },
              data: {
                status: DepositStatus.COMPLETED,
                completedAt: new Date(),
                amount: amount,
                metadata: { bankTxId: txId, rawDesc: tx.description, bankDate: tx.transactionDate },
              },
            });
          } else {
            await txDb.deposit.create({
              data: {
                userId: u.id,
                amount: amount,
                method: 'BANK_ACB',
                transactionCode: `DEP-BANK-${txId}`,
                status: DepositStatus.COMPLETED,
                completedAt: new Date(),
                metadata: { bankTxId: txId, rawDesc: tx.description, bankDate: tx.transactionDate },
              },
            });
          }

          await txDb.transaction.create({
            data: {
              userId: u.id,
              type: TransactionType.DEPOSIT,
              amount: amount,
              balanceBefore,
              balanceAfter,
              reference,
              description: `Nạp tiền ACB tự động (${tx.description})`,
              metadata: { bankTxId: txId, raw: tx },
            },
          });
        });

        newCreditedCount++;
        creditedTransactions.push({ txId, telegramId: targetUser.telegramId, amount });
      } catch (err: any) {
        console.error('[BankSync] Credit error:', err.message);
      }
    }

    return {
      success: true,
      configured: true,
      message: `Đồng bộ hoàn tất: đã cộng tiền cho ${newCreditedCount} giao dịch mới.`,
      newCreditedCount,
      creditedTransactions,
    };
  } catch (err: any) {
    return {
      success: false,
      configured: true,
      message: `Lỗi kết nối ThueApiBank: ${err.message}`,
      newCreditedCount: 0,
    };
  }
}
