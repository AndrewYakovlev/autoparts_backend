// src/prisma/prisma.service.ts
// Сервис для работы с Prisma ORM

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  INestApplication,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    // Конфигурация Prisma Client
    super({
      log:
        configService.get<string>('app.env') === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
      errorFormat: 'minimal',
    });
  }

  // Подключение к базе данных при инициализации модуля
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Successfully connected to database');

      // В режиме разработки выводим информацию о подключении
      if (this.configService.get<string>('app.env') === 'development') {
        const dbUrl = this.configService.get<string>('database.url');
        const maskedUrl = dbUrl?.replace(
          /(:\/\/)([^:]+):([^@]+)@/,
          '$1***:***@',
        );
        this.logger.debug(`Database URL: ${maskedUrl}`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to connect to database', error);
      throw error;
    }
  }

  // Отключение от базы данных при завершении работы
  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  // Включение shutdown hooks для корректного завершения работы
  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }

  // Метод для выполнения транзакций с автоматическим retry
  async executeTransaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let retries = 0;

    while (retries < maxRetries) {
      try {
        return await this.$transaction(fn);
      } catch (error) {
        retries++;

        // Проверяем, является ли ошибка временной
        if (this.isRetryableError(error) && retries < maxRetries) {
          this.logger.warn(
            `Transaction failed, retrying... (${retries}/${maxRetries})`,
          );
          // Экспоненциальная задержка между попытками
          await this.delay(Math.pow(2, retries) * 100);
          continue;
        }

        throw error;
      }
    }

    throw new Error('Transaction failed after maximum retries');
  }

  // Проверка, является ли ошибка временной
  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      'P2034', // Transaction failed due to concurrent update
      'P2028', // Transaction API error
    ];

    return error.code && retryableCodes.includes(error.code);
  }

  // Утилита для задержки
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Метод для безопасного удаления истекших записей
  async cleanupExpiredRecords(): Promise<void> {
    try {
      const now = new Date();

      // Удаляем истекшие OTP коды
      const deletedOtp = await this.otpCode.deleteMany({
        where: {
          OR: [{ expiresAt: { lte: now } }, { status: 'EXPIRED' }],
        },
      });

      // Удаляем истекшие refresh токены
      const deletedTokens = await this.refreshToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lte: now } }, { isRevoked: true }],
        },
      });

      // Удаляем истекшие анонимные сессии
      const deletedAnonymous = await this.anonymousUser.deleteMany({
        where: {
          expiresAt: { lte: now },
        },
      });

      this.logger.log(
        `Cleanup completed: ${deletedOtp.count} OTP codes, ` +
          `${deletedTokens.count} refresh tokens, ` +
          `${deletedAnonymous.count} anonymous sessions deleted`,
      );
    } catch (error) {
      this.logger.error('Failed to cleanup expired records', error);
    }
  }
}
