# 🚀 Быстрый старт

## Запуск через Docker (рекомендуется)

1. **Клонируйте репозиторий:**

```bash
git clone <repository-url>
cd autoparts-backend
```

2. **Создайте файл .env:**

```bash
cp .env.example .env
```

3. **Запустите проект:**

```bash
docker-compose up -d
```

4. **Проверьте статус:**

```bash
docker-compose ps
```

Приложение будет доступно по адресу: http://localhost:3000

## Запуск локально

### Предварительные требования:

- Node.js >= 20
- PostgreSQL >= 14
- npm >= 10

### Шаги:

1. **Установите зависимости:**

```bash
npm install
```

2. **Настройте переменные окружения:**

```bash
cp .env.example .env
# Отредактируйте .env и укажите правильные данные для подключения к БД
```

3. **Создайте базу данных:**

```sql
CREATE DATABASE autoparts_db;
```

4. **Выполните миграции:**

```bash
npm run prisma:migrate:dev
```

5. **Заполните БД тестовыми данными:**

```bash
npm run prisma:seed
```

6. **Запустите приложение:**

```bash
npm run start:dev
```

## 📱 Тестовые аккаунты

После выполнения seed скрипта будут созданы следующие аккаунты:

| Роль          | Телефон      | Описание             |
| ------------- | ------------ | -------------------- |
| Администратор | +79991234567 | Полный доступ        |
| Менеджер      | +79991234568 | Управление заказами  |
| Покупатель    | +79991234569 | Обычный пользователь |

## 🧪 Первый запрос

1. **Получите OTP код:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone": "+79991234567"}'
```

В режиме разработки OTP код будет выведен в консоль.

2. **Подтвердите OTP код:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+79991234567", "code": "1234"}'
```

3. **Используйте полученный токен:**

```bash
curl -X GET http://localhost:3000/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📚 Полезные команды

```bash
# Просмотр логов
docker-compose logs -f backend

# Открыть Prisma Studio
npm run prisma:studio

# Создать новую миграцию
npm run prisma:migrate:dev -- --name migration_name

# Проверить форматирование
npm run lint

# Запустить тесты
npm run test
```

## 🔗 Полезные ссылки

- Swagger документация: http://localhost:3000/docs
- Prisma Studio: http://localhost:5555
- pgAdmin: http://localhost:5050 (только с профилем dev)
- Health check: http://localhost:3000/health

## ❓ Частые проблемы

### Ошибка подключения к БД

```bash
# Проверьте, что PostgreSQL запущен
docker-compose ps

# Пересоздайте контейнеры
docker-compose down
docker-compose up -d
```

### Ошибка при миграции

```bash
# Сбросьте БД и выполните миграции заново
npm run prisma:migrate:reset
```

### Порт 3000 занят

```bash
# Измените порт в .env
PORT=3001
```
