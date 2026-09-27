import { InlineKeyboard } from 'grammy';

export function formatVND(val: number | string | null | undefined): string {
  const n = Math.floor(Number(val) || 0);
  return n.toLocaleString('vi-VN') + ' đ';
}

export function escapeHtml(str: string = ''): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function mainKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🛍️ KHO SẢN PHẨM', 'view_cats')
    .text('💳 NẠP TIỀN AUTO', 'view_deposit')
    .row()
    .text('👤 TÀI KHOẢN', 'view_account')
    .text('📦 ĐƠN HÀNG', 'view_orders')
    .row()
    .text('📞 CSKH & HỖ TRỢ', 'view_support')
    .text('🔄 LÀM MỚI', 'menu_refresh');
}

export function renderHome(u: any): { text: string; keyboard: InlineKeyboard } {
  const name = escapeHtml(u.firstName || u.username || 'Khách hàng');
  const tgId = u.telegramId;
  const balance = formatVND(u.balance);
  const spent = formatVND(u.totalSpent);

  const text =
    `🔥 <b>MMO DIGITAL SHOP - TỰ ĐỘNG 24/7</b> 🔥\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👋 Xin chào: <b>${name}</b>\n` +
    `🆔 Telegram ID: <code>${tgId}</code>\n` +
    `💰 Số dư ví: <b>${balance}</b>\n` +
    `🛒 Đã chi tiêu: <b>${spent}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚡ <i>Hệ thống tự động xuất kho tài nguyên trong 3 giây.</i>\n` +
    `⚡ <i>Nạp tiền tự động qua VietQR / ACB 24/7.</i>\n\n` +
    `👇 <b>Vui lòng chọn chức năng:</b>`;

  return { text, keyboard: mainKeyboard() };
}

export function renderAccount(u: any): { text: string; keyboard: InlineKeyboard } {
  const name = escapeHtml(u.firstName || u.username || 'Khách hàng');
  const text =
    `👤 <b>THÔNG TIN TÀI KHOẢN CỦA BẠN</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🆔 Telegram ID: <code>${u.telegramId}</code>\n` +
    `👤 Tên hiển thị: <b>${name}</b>\n` +
    `💰 Số dư khả dụng: <b>${formatVND(u.balance)}</b>\n` +
    `💸 Tổng tiền đã nạp: <b>${formatVND(u.totalDeposit)}</b>\n` +
    `🛒 Tổng tiền đã mua: <b>${formatVND(u.totalSpent)}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 <i>Số dư được dùng để mua ngay mọi tài nguyên trên hệ thống.</i>`;

  const kb = new InlineKeyboard()
    .text('💳 Nạp tiền ngay', 'view_deposit')
    .text('📦 Lịch sử đơn hàng', 'view_orders')
    .row()
    .text('🔄 Làm mới số dư', 'view_account')
    .text('🏠 Menu chính', 'go_home');

  return { text, keyboard: kb };
}

export function renderDeposit(
  u: any,
  bank: any,
  quickAmount?: number
): { text: string; keyboard: InlineKeyboard } {
  const tgId = u.telegramId;
  const syntax = `NAP ${tgId}`;
  const bankName = bank?.bankName || 'ACB';
  const accountNo = bank?.bankAccount || '6286861';
  const accountName = bank?.accountName || 'TRAN TUAN PHONG';
  const amtDisplay = quickAmount ? formatVND(quickAmount) : 'Tự do (tối thiểu 10,000 đ)';

  const text =
    `💳 <b>NẠP TIỀN TỰ ĐỘNG QUA NGÂN HÀNG (24/7)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🏦 Ngân hàng: <b>${bankName}</b>\n` +
    `💳 Số tài khoản: <code>${accountNo}</code>\n` +
    `👤 Tên chủ TK: <b>${accountName}</b>\n` +
    `💵 Số tiền nạp: <b>${amtDisplay}</b>\n\n` +
    `📝 <b>NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC):</b>\n` +
    `👉 <code>${syntax}</code>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ <b>LƯU Ý QUAN TRỌNG:</b>\n` +
    `• Vui lòng chuyển <b>chính xác nội dung:</b> <code>${syntax}</code>\n` +
    `• Hệ thống quét tự động cộng tiền sau <b>30 giây - 1 phút</b>.\n` +
    `• Sau khi chuyển thành công trên App ngân hàng, bấm nút <b>[ 🔄 Kiểm tra đã chuyển ]</b> bên dưới!`;

  const qrAmount = quickAmount || 50000;
  const qrUrl = `https://img.vietqr.io/image/${bankName}-${accountNo}-compact2.png?amount=${qrAmount}&addInfo=NAP%20${tgId}&accountName=${encodeURIComponent(
    accountName
  )}`;

  const kb = new InlineKeyboard()
    .text('💵 10k', 'dep_q:10000')
    .text('💵 20k', 'dep_q:20000')
    .text('💵 50k', 'dep_q:50000')
    .row()
    .text('💵 100k', 'dep_q:100000')
    .text('💵 200k', 'dep_q:200000')
    .text('💵 500k', 'dep_q:500000')
    .row()
    .url('📷 Mở mã QR VietQR', qrUrl)
    .row()
    .text('🔄 KIỂM TRA ĐÃ CHUYỂN TIỀN', 'dep_check')
    .row()
    .text('🏠 Menu chính', 'go_home');

  return { text, keyboard: kb };
}

export function renderProductDetail(p: any): { text: string; keyboard: InlineKeyboard } {
  const price = p.salePrice || p.price;
  const stock = p.availableStock ?? p.stock ?? 0;
  const stockStatus = stock > 0 ? `🟢 Còn ${stock} tài khoản` : `🔴 Tạm hết hàng`;
  const desc = escapeHtml(p.description || 'Chưa có mô tả chi tiết');

  const text =
    `📦 <b>SẢN PHẨM: ${escapeHtml(p.name)}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📂 Danh mục: <b>${escapeHtml(p.category?.name || 'Tài nguyên')}</b>\n` +
    `💰 Giá bán: <b>${formatVND(price)}</b>\n` +
    `📊 Trạng thái kho: <b>${stockStatus}</b>\n` +
    `⚡ Giao hàng: <b>Tự động gửi tài khoản ngay lập tức</b>\n\n` +
    `📝 <b>Chi tiết & Định dạng sản phẩm:</b>\n` +
    `<blockquote>${desc}</blockquote>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 <i>Định dạng MMO thường gặp: user|pass|2fa hoặc cookie/key bản quyền.</i>`;

  const kb = new InlineKeyboard();
  if (stock > 0) {
    kb.text(`🛒 MUA NGAY (1) • ${formatVND(price)}`, `buy_confirm:${p.id}`).row();
  }
  kb.text('🔙 Danh sách sản phẩm', `cat_prods:${p.categoryId}`)
    .text('🏠 Menu chính', 'go_home');

  return { text, keyboard: kb };
}

export function renderPurchaseSuccess(out: any): { text: string; keyboard: InlineKeyboard } {
  const { order, delivery = [], product } = out;
  const deliveredText = delivery.length ? delivery.join('\n') : 'Đơn hàng đang chờ xử lý thủ công.';

  const text =
    `🎉 <b>THANH TOÁN THÀNH CÔNG!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📦 Mã đơn hàng: <code>${order.orderCode}</code>\n` +
    `🛒 Sản phẩm: <b>${escapeHtml(product?.name || 'Tài nguyên MMO')}</b>\n` +
    `💰 Đã trừ số dư: <b>${formatVND(order.totalAmount)}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔐 <b>TÀI NGUYÊN CỦA BẠN (Sao chép ngay):</b>\n\n` +
    `<pre><code>${escapeHtml(deliveredText)}</code></pre>\n\n` +
    `⚠️ <b>LƯU Ý:</b>\n` +
    `• Vui lòng đổi mật khẩu tài khoản ngay sau khi nhận.\n` +
    `• Đơn hàng và thông tin này luôn được lưu tại mục <b>[Đơn hàng]</b>.`;

  const kb = new InlineKeyboard()
    .text('📦 Xem lịch sử đơn', 'view_orders')
    .text('🛍️ Mua thêm', 'view_cats')
    .row()
    .text('🏠 Menu chính', 'go_home');

  return { text, keyboard: kb };
}

export function renderSupport(supportUsername: string): { text: string; keyboard: InlineKeyboard } {
  const username = supportUsername.replace(/^@/, '');
  const text =
    `📞 <b>TRUNG TÂM CSKH & HỖ TRỢ KỸ THUẬT</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 Telegram Admin: <b>@${username}</b>\n` +
    `⏰ Thời gian hỗ trợ: <b>08:00 - 24:00 hàng ngày</b>\n\n` +
    `🛡️ <b>CHÍNH SÁCH BẢO HÀNH TÀI NGUYÊN MMO:</b>\n` +
    `• Cam kết lỗi 1 đổi 1 trong thời gian bảo hành theo mô tả sản phẩm.\n` +
    `• Sai pass, sai định dạng hoặc không login được sẽ được hỗ trợ đổi tài khoản mới ngay lập tức.\n` +
    `• Vui lòng gửi kèm <b>Mã đơn hàng (ORD-...)</b> khi nhắn tin cho Admin.`;

  const kb = new InlineKeyboard()
    .url('💬 Nhắn tin hỗ trợ Admin', `https://t.me/${username}`)
    .row()
    .text('🏠 Menu chính', 'go_home');

  return { text, keyboard: kb };
}
