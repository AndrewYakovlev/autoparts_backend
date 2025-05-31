// src/app.module.ts
// Основной модуль приложения

import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'
import { EventEmitterModule } from '@nestjs/event-emitter'
import appConfig from './config/app.config'
import { PrismaModule } from 'prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { HealthModule } from './health/health.module'
import { TasksModule } from './tasks/tasks.module'

@Module({
  imports: [
    // Конфигурация приложения
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        // Глобальный лимит
        name: 'global',
        ttl: 60, // 1 минута
        limit: 100, // 100 запросов
      },
      {
        // Лимит для авторизации
        name: 'auth',
        ttl: 3600, // 1 час
        limit: 10, // 10 попыток
      },
      {
        // Лимит для OTP
        name: 'otp',
        ttl: 3600, // 1 час
        limit: 5, // 5 попыток
      },
    ]),

    // Планировщик задач для очистки истекших токенов и OTP
    ScheduleModule.forRoot(),

    // Event emitter для асинхронных событий
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    // Модули приложения
    PrismaModule,
    AuthModule,
    UsersModule,
    HealthModule,
    TasksModule,
  ],
})
export class AppModule {}
