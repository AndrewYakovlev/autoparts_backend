# Dockerfile
# Multi-stage build для оптимизации размера образа

# Этап 1: Установка зависимостей
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production
RUN npm install -g prisma
RUN npx prisma generate

# Этап 2: Сборка приложения
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY tsconfig*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Этап 3: Финальный образ
FROM node:20-alpine AS production
WORKDIR /app

# Установка необходимых пакетов
RUN apk add --no-cache dumb-init

# Создание пользователя для запуска приложения
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Копирование необходимых файлов
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/prisma ./prisma
COPY --from=build /app/dist ./dist
COPY package*.json ./

# Смена пользователя
USER nestjs

# Открытие порта
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Запуск приложения через dumb-init для корректной обработки сигналов
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]