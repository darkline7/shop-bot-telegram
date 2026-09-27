# Telegram Shop

Production-oriented monorepo for a Telegram storefront and admin panel.

## Requirements
Node.js 20+, PostgreSQL 15+, Redis 7+. Docker Compose is provided.

## Quick start
1. `Copy-Item .env.example .env` and replace secrets.
2. `npm install`
3. `npm run db:generate`
4. `npm run db:migrate -- --name init`
5. `npm run db:seed`
6. `npm run dev`

API runs on `http://localhost:4000`, admin on `http://localhost:3000`. The seeded admin uses `ADMIN_USERNAME` and `ADMIN_PASSWORD` from `.env`; never commit the password.

## Docker
`docker compose up -d --build`, then run migrations/seed inside the API container with `docker compose exec api npm run db:migrate -w @shop/database` and `docker compose exec api npm run db:seed -w @shop/database`.

## Telegram
Set `TELEGRAM_BOT_TOKEN`. Development uses long polling; production should configure Telegram `setWebhook` to `/webhooks/telegram` and set `TELEGRAM_WEBHOOK_SECRET`. The bot uses the API as its source of truth.

## Payments
Manual deposits are implemented. Provider deposits use the `PaymentProvider` boundary in the API; add provider signature verification before enabling a real webhook. Never mark a deposit completed without a verified provider event.

## Security and operations
JWT access tokens are short-lived; refresh tokens are hashed and rotated. Purchase and balance changes run inside Prisma transactions. Keep database backups, rotate secrets, and use HTTPS/reverse proxy in production. Account stock is never returned in list endpoints.

## Commands
`npm run typecheck`, `npm run build`, `npm test`. API route list is in `docs/API.md`.
