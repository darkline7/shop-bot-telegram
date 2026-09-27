# API routes
- `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`
- `GET /api/categories`, `GET /api/products`
- Admin JWT: `POST/PATCH/DELETE /api/products`, `POST /api/products/:id/stock`
- `POST /api/purchase` (Telegram user, atomic balance/stock transaction)
- `POST /api/deposits`, `GET /api/deposits`, admin approve/reject endpoints
- Admin reads: `GET /api/dashboard`, `/api/orders`, `/api/users`
- `POST /webhooks/telegram` checks `x-telegram-bot-api-secret-token`

All responses use `{success,data}` or `{success:false,error:{code,message}}`. Payment provider adapters, queue workers, broadcast delivery, ticket reply transport and real Telegram webhook dispatch must be connected to provider credentials before production activation; manual deposit and bot polling are functional.
