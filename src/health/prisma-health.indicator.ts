// src/health/prisma-health.indicator.ts
// Индикатор здоровья для Prisma

import { Injectable } from '@nestjs/common'
import { HealthIndicatorResult } from '@nestjs/terminus'
import { PrismaService } from 'prisma/prisma.service'

@Injectable()
export class PrismaHealthIndicator {
  constructor(private readonly prisma: PrismaService) {}

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`

      // Возвращаем объект напрямую в правильном формате
      return {
        [key]: {
          status: 'up',
          message: 'Database is online',
        },
      }
    } catch (error) {
      // Обработка ошибки с правильной типизацией
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Возвращаем объект с статусом 'down'
      return {
        [key]: {
          status: 'down',
          message: 'Database is offline',
          error: errorMessage,
        },
      }
    }
  }
}
