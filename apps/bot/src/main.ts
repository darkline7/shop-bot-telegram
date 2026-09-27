import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });

import { Bot } from 'grammy';
import {
  handleAccount,
  handleBuyConfirm,
  handleCategories,
  handleCategoryProducts,
  handleDepositCheck,
  handleDepositQuick,
  handleHome,
  handleProductDetail,
  handleStart,
  handleViewDeposit,
  handleViewOrder,
  handleViewOrders,
  handleViewSupport,
} from './handlers';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured in .env');

const bot = new Bot(token);

// Commands
bot.command(['start', 'menu'], handleStart);
bot.command('shop', handleCategories);
bot.command('deposit', handleViewDeposit);

// Callback routing (Single-message interactive UI)
bot.callbackQuery(['go_home', 'menu_refresh'], handleHome);
bot.callbackQuery('view_account', handleAccount);
bot.callbackQuery('view_cats', handleCategories);
bot.callbackQuery(/^cat_prods:(.+)$/, handleCategoryProducts);
bot.callbackQuery(/^pdetail:(.+)$/, handleProductDetail);
bot.callbackQuery(/^buy_confirm:(.+)$/, handleBuyConfirm);
bot.callbackQuery('view_deposit', handleViewDeposit);
bot.callbackQuery(/^dep_q:(\d+)$/, handleDepositQuick);
bot.callbackQuery('dep_check', handleDepositCheck);
bot.callbackQuery('view_orders', handleViewOrders);
bot.callbackQuery(/^view_order:(.+)$/, handleViewOrder);
bot.callbackQuery('view_support', handleViewSupport);

bot.catch((err) => {
  console.error('[Bot Error]', err.error);
});

bot.start();
console.log('🤖 MMO Telegram Bot running with single-message UI & VietQR auto-bank sync.');

