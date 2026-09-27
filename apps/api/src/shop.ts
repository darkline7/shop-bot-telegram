import { Router } from 'express';
import { ProductType, Status, AdminRole, ItemStatus } from '@shop/database';
import { db, ok, fail, auth, roles, AuthRequest, audit } from './core';

export const shopRouter = Router();

// ================= CATEGORIES =================
shopRouter.get('/categories', async (req, res) => {
  const all = req.query.all === 'true';
  const categories = await db.category.findMany({
    where: all ? {} : { status: Status.ACTIVE },
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: 'asc' },
  });
  return ok(res, categories);
});

shopRouter.post('/categories', auth, roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AuthRequest, res) => {
  try {
    const { name, slug, description, image, sortOrder } = req.body || {};
    if (!name) return fail(res, 'INVALID_DATA', 'Tên danh mục là bắt buộc');
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
    const cat = await db.category.create({
      data: { name, slug: finalSlug, description: description || '', image, sortOrder: Number(sortOrder) || 0 },
    });
    await audit(req, 'CREATE', 'CATEGORY', cat.id, cat);
    return ok(res, cat);
  } catch (err: any) {
    return fail(res, 'CREATE_CATEGORY_FAILED', err.message || 'Không thể tạo danh mục');
  }
});

shopRouter.delete('/categories/:id', auth, roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const count = await db.product.count({ where: { categoryId: id } });
    if (count > 0) {
      await db.category.update({ where: { id }, data: { status: Status.INACTIVE } });
    } else {
      await db.category.delete({ where: { id } });
    }
    await audit(req, 'DELETE', 'CATEGORY', id);
    return ok(res, { deleted: true });
  } catch (err: any) {
    return fail(res, 'DELETE_CATEGORY_FAILED', err.message || 'Không thể xóa danh mục');
  }
});

// ================= PRODUCTS =================
shopRouter.get('/products', async (req, res) => {
  const q = String(req.query.search || '');
  const categoryId = req.query.categoryId ? String(req.query.categoryId) : undefined;
  const all = req.query.status === 'ALL';

  const products = await db.product.findMany({
    where: {
      ...(all ? {} : { status: Status.ACTIVE }),
      ...(categoryId ? { categoryId } : {}),
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    },
    include: {
      category: true,
      _count: { select: { items: { where: { status: ItemStatus.AVAILABLE } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const data = products.map((p) => ({
    ...p,
    availableStock: p._count.items,
    stock: p._count.items,
  }));
  return ok(res, data);
});

shopRouter.get('/products/:id', async (req, res) => {
  const product = await db.product.findUnique({
    where: { id: String(req.params.id) },
    include: {
      category: true,
      _count: { select: { items: { where: { status: ItemStatus.AVAILABLE } } } },
    },
  });
  if (!product) return fail(res, 'NOT_FOUND', 'Không tìm thấy sản phẩm', 404);
  return ok(res, { ...product, availableStock: product._count.items, stock: product._count.items });
});

shopRouter.post('/products', auth, roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AuthRequest, res) => {
  try {
    const b = req.body || {};
    if (!b.name || !b.categoryId || b.price === undefined) {
      return fail(res, 'INVALID_DATA', 'Tên sản phẩm, danh mục và giá là bắt buộc');
    }
    const slug = b.slug || b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
    const p = await db.product.create({
      data: {
        categoryId: b.categoryId,
        name: b.name,
        slug,
        description: b.description || '',
        thumbnail: b.thumbnail,
        price: b.price,
        salePrice: b.salePrice ? b.salePrice : null,
        productType: b.productType || ProductType.DIGITAL,
        autoDelivery: b.autoDelivery !== false,
        status: b.status || Status.ACTIVE,
      },
      include: { category: true },
    });
    await audit(req, 'CREATE', 'PRODUCT', p.id, p);
    return ok(res, p);
  } catch (err: any) {
    return fail(res, 'CREATE_PRODUCT_FAILED', err.message || 'Không thể tạo sản phẩm');
  }
});

shopRouter.patch('/products/:id', auth, roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const p = await db.product.update({ where: { id }, data: req.body, include: { category: true } });
    await audit(req, 'UPDATE', 'PRODUCT', p.id, p);
    return ok(res, p);
  } catch (err: any) {
    return fail(res, 'UPDATE_PRODUCT_FAILED', err.message || 'Không thể cập nhật sản phẩm', 404);
  }
});

shopRouter.delete('/products/:id', auth, roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const orderItemCount = await db.orderItem.count({ where: { productId: id } });
    if (orderItemCount === 0) {
      await db.productItem.deleteMany({ where: { productId: id } });
      await db.product.delete({ where: { id } });
    } else {
      await db.product.update({ where: { id }, data: { status: Status.INACTIVE } });
    }
    await audit(req, 'DELETE', 'PRODUCT', id);
    return ok(res, { deleted: true, soft: orderItemCount > 0 });
  } catch (err: any) {
    return fail(res, 'DELETE_PRODUCT_FAILED', err.message || 'Không thể xóa sản phẩm');
  }
});

// ================= INVENTORY / KHO TÀI NGUYÊN =================

// Lấy danh sách tài khoản trong kho của sản phẩm
shopRouter.get('/products/:id/stock', auth, roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AuthRequest, res) => {
  try {
    const productId = String(req.params.id);
    const statusParam = req.query.status ? String(req.query.status) : undefined;
    const items = await db.productItem.findMany({
      where: {
        productId,
        ...(statusParam && statusParam !== 'ALL' ? { status: statusParam as ItemStatus } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const [availableCount, soldCount] = await Promise.all([
      db.productItem.count({ where: { productId, status: ItemStatus.AVAILABLE } }),
      db.productItem.count({ where: { productId, status: ItemStatus.SOLD } }),
    ]);
    return ok(res, { items, availableCount, soldCount });
  } catch (err: any) {
    return fail(res, 'GET_STOCK_FAILED', err.message || 'Không thể tải kho hàng');
  }
});

// Nhập thêm tài khoản vào kho (1 dòng = 1 tài khoản/key)
shopRouter.post('/products/:id/stock', auth, roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AuthRequest, res) => {
  const productId = String(req.params.id);
  const rawContent = String(req.body.content || '');
  const lines = rawContent
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

  if (!lines.length) return fail(res, 'EMPTY_STOCK', 'Vui lòng nhập ít nhất 1 dòng tài nguyên');

  const added = await db.$transaction(async (tx) => {
    await tx.productItem.createMany({
      data: lines.map((content) => ({
        productId,
        content,
        status: ItemStatus.AVAILABLE,
      })),
    });
    const currentStock = await tx.productItem.count({
      where: { productId, status: ItemStatus.AVAILABLE },
    });
    await tx.product.update({
      where: { id: productId },
      data: { stock: currentStock },
    });
    return lines.length;
  });

  await audit(req, 'ADD_STOCK', 'PRODUCT', productId, { count: added });
  return ok(res, { added });
});

// Xóa 1 tài khoản cụ thể khỏi kho (chỉ xóa tài khoản chưa bán)
shopRouter.delete('/products/:id/stock/:itemId', auth, roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AuthRequest, res) => {
  try {
    const { id: productId, itemId } = req.params;
    const item = await db.productItem.findFirst({
      where: { id: String(itemId), productId: String(productId) },
    });
    if (!item) return fail(res, 'ITEM_NOT_FOUND', 'Không tìm thấy mục trong kho', 404);
    if (item.status === ItemStatus.SOLD) {
      return fail(res, 'ITEM_ALREADY_SOLD', 'Không thể xóa tài nguyên đã bán cho khách', 400);
    }

    await db.$transaction(async (tx) => {
      await tx.productItem.delete({ where: { id: String(itemId) } });
      const currentStock = await tx.productItem.count({
        where: { productId: String(productId), status: ItemStatus.AVAILABLE },
      });
      await tx.product.update({
        where: { id: String(productId) },
        data: { stock: currentStock },
      });
    });

    await audit(req, 'DELETE_STOCK_ITEM', 'PRODUCT_ITEM', String(itemId));
    return ok(res, { deleted: true });
  } catch (err: any) {
    return fail(res, 'DELETE_STOCK_FAILED', err.message || 'Không thể xóa mục kho');
  }
});

// Xóa toàn bộ tài khoản chưa bán của sản phẩm
shopRouter.delete('/products/:id/stock', auth, roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AuthRequest, res) => {
  try {
    const productId = String(req.params.id);
    const result = await db.$transaction(async (tx) => {
      const del = await tx.productItem.deleteMany({
        where: { productId, status: ItemStatus.AVAILABLE },
      });
      await tx.product.update({
        where: { id: productId },
        data: { stock: 0 },
      });
      return del.count;
    });

    await audit(req, 'CLEAR_STOCK', 'PRODUCT', productId, { count: result });
    return ok(res, { clearedCount: result });
  } catch (err: any) {
    return fail(res, 'CLEAR_STOCK_FAILED', err.message || 'Không thể xóa kho hàng');
  }
});

