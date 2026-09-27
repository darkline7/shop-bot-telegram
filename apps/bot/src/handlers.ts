import { InlineKeyboard } from 'grammy';
import {
  escapeHtml,
  formatVND,
  renderAccount,
  renderDeposit,
  renderHome,
  renderProductDetail,
  renderPurchaseSuccess,
  renderSupport,
} from './ui';

const api = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');
const activeMenus = new Map<number, number>();

export async function call(endpoint: string, body?: unknown) {
  const r = await fetch(`${api}/api${endpoint}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let j: any;
  try {
    j = await r.json();
  } catch {
    throw new Error(`API HTTP ${r.status}`);
  }
  if (!r.ok || !j.success) {
    const err = new Error(j?.error?.message || `API HTTP ${r.status}`);
    (err as any).code = j?.error?.code;
    throw err;
  }
  return j.data;
}

export async function ensureUser(ctx: any) {
  return call('/users/telegram', {
    telegramId: String(ctx.from.id),
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    lastName: ctx.from.last_name,
  });
}

export async function getBankConfig() {
  try {
    return await call('/bank/config');
  } catch {
    return {
      bankName: 'ACB',
      bankAccount: '6286861',
      accountName: 'TRAN TUAN PHONG',
      minDeposit: 10000,
      supportUsername: 'admin_support',
    };
  }
}

// Cập nhật giao diện trên tin nhắn hiện có, tránh tạo tin nhắn mới làm trôi lịch sử
export async function navigate(ctx: any, text: string, reply_markup?: InlineKeyboard) {
  const chatId = ctx.chat?.id ?? ctx.callbackQuery?.message?.chat?.id;
  const isCallback = Boolean(ctx.callbackQuery?.message);

  try {
    if (isCallback) {
      return await ctx.editMessageText(text, {
        reply_markup,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });
    }

    if (chatId && activeMenus.has(chatId)) {
      const oldId = activeMenus.get(chatId)!;
      try {
        return await ctx.api.editMessageText(chatId, oldId, text, {
          reply_markup,
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true },
        });
      } catch {}
    }

    const sent = await ctx.reply(text, {
      reply_markup,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
    if (chatId && sent?.message_id) {
      activeMenus.set(chatId, sent.message_id);
    }
    return sent;
  } catch (err: any) {
    if (err.message?.includes('message is not modified')) return;
    throw err;
  }
}

export async function handleStart(ctx: any) {
  try {
    const user = await ensureUser(ctx);
    const { text, keyboard } = renderHome(user);
    return await navigate(ctx, text, keyboard);
  } catch (e: any) {
    return ctx.reply(`❌ Lỗi kết nối hệ thống: ${e.message}`);
  }
}

export async function handleHome(ctx: any) {
  await ctx.answerCallbackQuery().catch(() => {});
  try {
    const user = await ensureUser(ctx);
    const { text, keyboard } = renderHome(user);
    return await navigate(ctx, text, keyboard);
  } catch (e: any) {
    return ctx.answerCallbackQuery({ text: `❌ ${e.message}`, show_alert: true });
  }
}

export async function handleAccount(ctx: any) {
  await ctx.answerCallbackQuery().catch(() => {});
  try {
    const user = await call(`/users/by-telegram/${ctx.from.id}`);
    const { text, keyboard } = renderAccount(user);
    return await navigate(ctx, text, keyboard);
  } catch (e: any) {
    return ctx.answerCallbackQuery({ text: `❌ ${e.message}`, show_alert: true });
  }
}

export async function handleCategories(ctx: any) {
  await ctx.answerCallbackQuery().catch(() => {});
  try {
    const cats = await call('/categories');
    const kb = new InlineKeyboard();
    for (const c of cats) {
      const pCount = c._count?.products ? ` (${c._count.products} SP)` : '';
      kb.text(`📂 ${c.name}${pCount}`, `cat_prods:${c.id}`).row();
    }
    kb.text('🏠 Menu chính', 'go_home');

    const text =
      `🛍️ <b>DANH MỤC TÀI NGUYÊN MMO</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Vui lòng chọn danh mục tài nguyên bạn cần mua:\n\n` +
      `<i>⚡ Tài nguyên được giao tự động 100% ngay khi mua.</i>`;

    return await navigate(ctx, text, kb);
  } catch (e: any) {
    return ctx.answerCallbackQuery({ text: `❌ ${e.message}`, show_alert: true });
  }
}

export async function handleCategoryProducts(ctx: any) {
  await ctx.answerCallbackQuery().catch(() => {});
  const catId = ctx.match[1];
  try {
    const products: any[] = await call(`/products?categoryId=${encodeURIComponent(catId)}`);
    const kb = new InlineKeyboard();

    for (const p of products) {
      const price = formatVND(p.salePrice || p.price);
      const stock = p.availableStock ?? p.stock ?? 0;
      const stockTag = stock > 0 ? `[Còn: ${stock}]` : '[Hết hàng]';
      kb.text(`📦 ${p.name} • ${price} ${stockTag}`, `pdetail:${p.id}`).row();
    }
    kb.text('🔙 Chọn danh mục khác', 'view_cats').text('🏠 Menu', 'go_home');

    const text =
      `📦 <b>DANH SÁCH SẢN PHẨM</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      (products.length
        ? `Chọn sản phẩm bên dưới để xem chi tiết định dạng & mua hàng:`
        : `Hiện tại danh mục này đang tạm hết hàng.`);

    return await navigate(ctx, text, kb);
  } catch (e: any) {
    return ctx.answerCallbackQuery({ text: `❌ ${e.message}`, show_alert: true });
  }
}

export async function handleProductDetail(ctx: any) {
  await ctx.answerCallbackQuery().catch(() => {});
  const pId = ctx.match[1];
  try {
    const product = await call(`/products/${pId}`);
    const { text, keyboard } = renderProductDetail(product);
    return await navigate(ctx, text, keyboard);
  } catch (e: any) {
    return ctx.answerCallbackQuery({ text: `❌ ${e.message}`, show_alert: true });
  }
}

export async function handleBuyConfirm(ctx: any) {
  await ctx.answerCallbackQuery({ text: '⏳ Đang xử lý mua hàng...' }).catch(() => {});
  const productId = ctx.match[1];
  const telegramId = String(ctx.from.id);

  try {
    const out = await call('/purchase', { telegramId, productId, quantity: 1 });
    const { text, keyboard } = renderPurchaseSuccess(out);
    return await navigate(ctx, text, keyboard);
  } catch (e: any) {
    const msg = e.message;
    if (e.code === 'INSUFFICIENT_BALANCE') {
      const u = await call(`/users/by-telegram/${telegramId}`);
      const p = await call(`/products/${productId}`);
      const price = Number(p.salePrice || p.price);
      const lack = price - Number(u.balance);

      const text =
        `❌ <b>SỐ DƯ KHÔNG ĐỦ</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🛒 Sản phẩm: <b>${escapeHtml(p.name)}</b>\n` +
        `💰 Giá bán: <b>${formatVND(price)}</b>\n` +
        `💵 Số dư ví hiện tại: <b>${formatVND(u.balance)}</b>\n` +
        `⚠️ Cần nạp thêm: <b>${formatVND(lack)}</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👉 <i>Bấm nút <b>[Nạp tiền ngay]</b> để nạp tiền tự động qua VietQR!</i>`;

      const kb = new InlineKeyboard()
        .text('💳 NẠP TIỀN NGAY', 'view_deposit')
        .row()
        .text('🔙 Quay lại sản phẩm', `pdetail:${productId}`)
        .text('🏠 Menu chính', 'go_home');

      return await navigate(ctx, text, kb);
    }

    if (e.code === 'OUT_OF_STOCK') {
      return ctx.answerCallbackQuery({
        text: '⚠️ Sản phẩm này vừa hết tài khoản trong kho. Vui lòng quay lại sau!',
        show_alert: true,
      });
    }

    return ctx.answerCallbackQuery({ text: `❌ Mua hàng thất bại: ${msg}`, show_alert: true });
  }
}
export async function handleViewDeposit(ctx: any) {
  await ctx.answerCallbackQuery().catch(() => {});
  try {
    const [user, bank] = await Promise.all([
      call(`/users/by-telegram/${ctx.from.id}`),
      getBankConfig(),
    ]);
    const { text, keyboard } = renderDeposit(user, bank);
    return await navigate(ctx, text, keyboard);
  } catch (e: any) {
    return ctx.answerCallbackQuery({ text: `❌ ${e.message}`, show_alert: true });
  }
}

export async function handleDepositQuick(ctx: any) {
  await ctx.answerCallbackQuery().catch(() => {});
  const amount = Number(ctx.match[1]);
  try {
    const [user, bank] = await Promise.all([
      call(`/users/by-telegram/${ctx.from.id}`),
      getBankConfig(),
    ]);
    const { text, keyboard } = renderDeposit(user, bank, amount);
    return await navigate(ctx, text, keyboard);
  } catch (e: any) {
    return ctx.answerCallbackQuery({ text: `❌ ${e.message}`, show_alert: true });
  }
}

export async function handleDepositCheck(ctx: any) {
  await ctx.answerCallbackQuery({ text: '🔄 Đang kiểm tra giao dịch từ ngân hàng...' }).catch(() => {});
  const telegramId = String(ctx.from.id);

  try {
    const res = await call('/deposits/check-user', { telegramId });
    const user = res.user;
    const lastDep = res.lastDeposit;

    const isRecent =
      lastDep &&
      lastDep.status === 'COMPLETED' &&
      new Date().getTime() - new Date(lastDep.completedAt || lastDep.updatedAt).getTime() < 10 * 60 * 1000;

    if (isRecent) {
      const text =
        `🎉 <b>NẠP TIỀN THÀNH CÔNG!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💰 Số tiền nạp: <b>+${formatVND(lastDep.amount)}</b>\n` +
        `💵 Số dư hiện tại của bạn: <b>${formatVND(user.balance)}</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Cảm ơn bạn đã tin tưởng dịch vụ của shop! Bạn có thể đi mua tài nguyên ngay bây giờ.`;

      const kb = new InlineKeyboard()
        .text('🛍️ Mua tài nguyên ngay', 'view_cats')
        .row()
        .text('🏠 Menu chính', 'go_home');

      return await navigate(ctx, text, kb);
    }

    return ctx.answerCallbackQuery({
      text: '⏳ Chưa thấy giao dịch mới. Nếu bạn vừa chuyển khoản, vui lòng đợi 30 giây rồi bấm kiểm tra lại nhé!',
      show_alert: true,
    });
  } catch (e: any) {
    return ctx.answerCallbackQuery({ text: `❌ Lỗi kiểm tra: ${e.message}`, show_alert: true });
  }
}

export async function handleViewOrders(ctx: any) {
  await ctx.answerCallbackQuery().catch(() => {});
  const telegramId = String(ctx.from.id);

  try {
    const orders: any[] = await call(`/users/by-telegram/${telegramId}/orders`);
    const kb = new InlineKeyboard();

    for (const o of orders.slice(0, 10)) {
      const prodName = o.items?.[0]?.product?.name || 'Đơn hàng';
      kb.text(`📦 ${o.orderCode} (${prodName})`, `view_order:${o.id}`).row();
    }
    kb.text('🏠 Menu chính', 'go_home');

    const text =
      `📦 <b>LỊCH SỬ ĐƠN HÀNG CỦA BẠN</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      (orders.length
        ? `Bấm vào đơn hàng bên dưới để <b>xem lại tài khoản / key đã mua:</b>`
        : `Bạn chưa mua đơn hàng nào trên hệ thống.`);

    return await navigate(ctx, text, kb);
  } catch (e: any) {
    return ctx.answerCallbackQuery({ text: `❌ ${e.message}`, show_alert: true });
  }
}

export async function handleViewOrder(ctx: any) {
  await ctx.answerCallbackQuery().catch(() => {});
  const orderId = ctx.match[1];
  const telegramId = String(ctx.from.id);

  try {
    const orders: any[] = await call(`/users/by-telegram/${telegramId}/orders`);
    const order = orders.find((o: any) => o.id === orderId);

    if (!order) {
      return ctx.answerCallbackQuery({ text: 'Không tìm thấy đơn hàng này', show_alert: true });
    }

    const prod = order.items?.[0]?.product;
    const delivered = (order.productItems || []).map((i: any) => i.content).join('\n') || 'Tài nguyên xuất thủ công.';

    const text =
      `📦 <b>CHI TIẾT ĐƠN HÀNG: ${order.orderCode}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🛒 Sản phẩm: <b>${escapeHtml(prod?.name || 'Tài nguyên')}</b>\n` +
      `💰 Số tiền đã trả: <b>${formatVND(order.totalAmount)}</b>\n` +
      `📅 Ngày mua: <b>${new Date(order.createdAt).toLocaleString('vi-VN')}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔐 <b>TÀI NGUYÊN ĐÃ NHẬN (Copy bên dưới):</b>\n\n` +
      `<pre><code>${escapeHtml(delivered)}</code></pre>`;

    const kb = new InlineKeyboard()
      .text('🔙 Quay lại danh sách đơn', 'view_orders')
      .text('🏠 Menu chính', 'go_home');

    return await navigate(ctx, text, kb);
  } catch (e: any) {
    return ctx.answerCallbackQuery({ text: `❌ ${e.message}`, show_alert: true });
  }
}

export async function handleViewSupport(ctx: any) {
  await ctx.answerCallbackQuery().catch(() => {});
  try {
    const bank = await getBankConfig();
    const { text, keyboard } = renderSupport(bank.supportUsername || 'admin_support');
    return await navigate(ctx, text, keyboard);
  } catch (e: any) {
    return ctx.answerCallbackQuery({ text: `❌ ${e.message}`, show_alert: true });
  }
}

