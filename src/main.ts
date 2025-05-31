// src/main.ts
// Точка входа в приложение

import { NestFactory } from '@nestjs/core'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import helmet from 'helmet'
import * as compression from 'compression'
import { AppModule } from './app.module'
import { PrismaService } from 'prisma/prisma.service'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'

async function bootstrap() {
  // Создаем приложение
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  })

  // Получаем сервис конфигурации
  const configService = app.get(ConfigService)
  const port = configService.get<number>('app.port')
  const apiPrefix = configService.get<string>('app.apiPrefix')
  const corsOptions = configService.get('cors')

  // Применяем глобальные middleware
  app.use(helmet()) // Защита от известных уязвимостей
  app.use(compression()) // Сжатие ответов

  // Настраиваем CORS
  app.enableCors(corsOptions)

  // Настраиваем версионирование API
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  })

  // Устанавливаем глобальный префикс
  app.setGlobalPrefix(apiPrefix)

  // Применяем глобальные pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Удаляет поля, не описанные в DTO
      transform: true, // Автоматическое преобразование типов
      forbidNonWhitelisted: true, // Запрещает неизвестные поля
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )

  // Применяем глобальные фильтры
  app.useGlobalFilters(new HttpExceptionFilter())

  // Применяем глобальные interceptors
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor())

  // Настраиваем Swagger
  if (configService.get<boolean>('swagger.enabled')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(configService.get<string>('swagger.title'))
      .setDescription(configService.get<string>('swagger.description'))
      .setVersion(configService.get<string>('swagger.version'))
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('auth', 'Авторизация и аутентификация')
      .addTag('users', 'Управление пользователями')
      .addTag('profile', 'Управление профилем')
      .build()

    const document = SwaggerModule.createDocument(app, swaggerConfig)
    const swaggerPath = configService.get<string>('swagger.path')
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    })

    console.log(`📚 Swagger documentation available at: http://localhost:${port}/${swaggerPath}`)
  }

  // Подключаем Prisma shutdown hooks
  const prismaService = app.get(PrismaService)
  await prismaService.enableShutdownHooks(app)

  // Запускаем сервер
  await app.listen(port)

  console.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`)
  console.log(`🌍 Environment: ${configService.get<string>('app.env')}`)

  // В режиме разработки выводим дополнительную информацию
  if (configService.get<string>('app.env') === 'development') {
    console.log(`📱 OTP codes will be printed to console (test mode)`)
  }
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error)
  process.exit(1)
})
