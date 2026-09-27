FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build -w @shop/bot
CMD ["npm","run","start","-w","@shop/bot"]
