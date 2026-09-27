FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm install && npm run db:generate && npm run build -w @shop/api
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app .
CMD ["npm","run","start","-w","@shop/api"]
