# AutoParts Backend API

Backend для интернет-магазина автозапчастей с авторизацией по номеру телефона и OTP кодам.

## 🚀 Особенности

- 🔐 Авторизация по номеру телефона с OTP кодами
- 👤 Анонимные пользователи для неавторизованных действий
- 🎭 Система ролей (Покупатель, Менеджер, Администратор)
- 👥 Управление профилями пользователей
- 🔄 JWT токены с refresh механизмом
- 📱 OTP коды на 4 цифры, действительны 5 минут
- ⏱️ Защита от спама: повторная отправка через 3 минуты
- 🗄️ PostgreSQL + Prisma ORM
- 📖 Swagger/OpenAPI документация
- 🛡️ Rate limiting и безопасность

## 📋 Требования

- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL >= 14

## 🛠️ Установка

1. Клонируйте репозиторий:

```bash
git clone https://github.com/your-repo/autoparts-backend.git
cd autoparts-backend
```

2. Установите зависимости:

```bash
npm install
```

3. Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

4. Настройте переменные окружения в `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/autoparts?schema=public"
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
# ... остальные переменные
```

5. Выполните миграции базы данных:

```bash
npm run prisma:migrate:dev
```

6. Генерация Prisma Client:

```bash
npm run prisma:generate
```

## 🚀 Запуск

### Разработка

```bash
npm run start:dev
```

### Продакшен

```bash
npm run build
npm run start:prod
```

### Docker

```bash
docker-compose up -d
```

## 📚 API Документация

После запуска приложения, Swagger документация доступна по адресу:

```
http://localhost:3000/docs
```

## 🔑 Авторизация

### 1. Запрос OTP кода

```bash
POST /api/v1/auth/otp/request
{
  "phone": "+79991234567"
}
```

### 2. Подтверждение OTP кода

```bash
POST /api/v1/auth/otp/verify
{
  "phone": "+79991234567",
  "code": "1234"
}
```

### 3. Обновление токенов

```bash
POST /api/v1/auth/token/refresh
{
  "refreshToken": "your-refresh-token"
}
```

## 👥 Роли пользователей

### 🛒 CUSTOMER (Покупатель)

- Может редактировать только свой профиль
- Доступ к каталогу товаров и корзине
- Создание заказов

### 📊 MANAGER (Менеджер)

- Все права покупателя
- Просмотр и редактирование всех профилей
- Управление заказами
- Доступ к отчетам

### 👑 ADMIN (Администратор)

- Все права менеджера
- Изменение ролей пользователей
- Управление системными настройками
- Полный доступ ко всем функциям

## 🔒 Безопасность

- Все пароли хешируются с использованием bcrypt
- JWT токены имеют короткое время жизни (15 минут)
- Refresh токены хранятся в БД и могут быть отозваны
- Rate limiting на все критичные эндпоинты
- Валидация всех входящих данных
- CORS настройки для защиты от несанкционированных запросов

## 📁 Структура проекта

```
src/
├── auth/               # Модуль авторизации
│   ├── decorators/     # Декораторы для авторизации
│   ├── dto/            # DTO для запросов/ответов
│   ├── guards/         # Guards для защиты роутов
│   ├── strategies/     # Passport стратегии
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/              # Модуль пользователей
│   ├── dto/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── common/             # Общие компоненты
│   ├── filters/        # Exception фильтры
│   └── interceptors/   # Interceptors
├── config/             # Конфигурация
├── prisma/             # Prisma ORM
├── health/             # Health checks
├── tasks/              # Периодические задачи
├── app.module.ts       # Главный модуль
└── main.ts             # Точка входа
```

## 🧪 Тестирование

```bash
# Юнит тесты
npm run test

# e2e тесты
npm run test:e2e

# Покрытие тестами
npm run test:cov
```

## 📝 Скрипты

- `npm run start` - Запуск приложения
- `npm run start:dev` - Запуск в режиме разработки
- `npm run build` - Сборка приложения
- `npm run lint` - Проверка кода линтером
- `npm run format` - Форматирование кода
- `npm run prisma:studio` - Запуск Prisma Studio
- `npm run prisma:migrate:dev` - Создание миграций
- `npm run prisma:seed` - Заполнение БД тестовыми данными

## 🔄 Периодические задачи

- Очистка истекших OTP кодов - каждые 15 минут
- Очистка истекших refresh токенов - каждый час
- Очистка истекших анонимных сессий - каждые 6 часов
- Обновление статистики - ежедневно в 3:00
- Проверка неактивных пользователей - еженедельно

## 🚨 Обработка ошибок

Все ошибки возвращаются в едином формате:

```json
{
  "statusCode": 400,
  "message": "Описание ошибки",
  "error": "Bad Request",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/users"
}
```

## 📊 Мониторинг

- Health check: `GET /health`
- Ping: `GET /health/ping`

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature ветку (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add some amazing feature'`)
4. Push в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

MIT License
