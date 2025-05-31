// src/config/app.config.ts
// Конфигурация приложения

export default () => ({
  // Настройки приложения
  app: {
    port: parseInt(process.env.PORT, 10) || 3000,
    env: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || 'api/v1',
  },

  // Настройки базы данных
  database: {
    url: process.env.DATABASE_URL,
  },

  // Настройки JWT
  jwt: {
    // Секрет для access токенов
    accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret-key',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m', // 15 минут

    // Секрет для refresh токенов
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '90d', // 90 дней

    // Секрет для анонимных токенов
    anonymousSecret: process.env.JWT_ANONYMOUS_SECRET || 'anonymous-secret-key',
    anonymousExpiresIn: process.env.JWT_ANONYMOUS_EXPIRES_IN || '30d', // 30 дней
  },

  // Настройки OTP
  otp: {
    length: 4, // Длина OTP кода
    expiresIn: 5 * 60 * 1000, // 5 минут в миллисекундах
    resendTimeout: 3 * 60 * 1000, // 3 минуты в миллисекундах
    maxAttempts: 3, // Максимальное количество попыток ввода
    testMode: process.env.NODE_ENV === 'development', // В dev режиме коды выводятся в консоль
  },

  // Настройки SMS провайдера
  sms: {
    provider: process.env.SMS_PROVIDER || 'console', // console для разработки
    apiKey: process.env.SMS_API_KEY,
    sender: process.env.SMS_SENDER || 'AutoParts',
  },

  // Настройки rate limiting
  rateLimit: {
    // Общий лимит для всех эндпоинтов
    global: {
      ttl: 60, // 1 минута
      limit: 100, // 100 запросов в минуту
    },
    // Лимит для отправки OTP
    otp: {
      ttl: 60 * 60, // 1 час
      limit: 5, // 5 попыток в час
    },
    // Лимит для попыток авторизации
    auth: {
      ttl: 60 * 60, // 1 час
      limit: 10, // 10 попыток в час
    },
  },

  // Настройки CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
    credentials: true,
  },

  // Настройки Swagger
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    title: 'AutoParts API',
    description: 'API для интернет-магазина автозапчастей',
    version: '1.0.0',
    path: 'docs',
  },

  // Настройки безопасности
  security: {
    bcryptRounds: 10,
    phoneRegex: /^\+7\d{10}$/, // Формат российского номера телефона
  },
});
