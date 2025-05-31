// src/health/prisma-health.indicator.ts
// Индикатор здоровья для Prisma

import { Injectable } from '@nestjs/common'
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus'
import { PrismaService } from 'prisma/prisma.service'

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  async pingCheck(key: string, prisma: PrismaService): Promise<HealthIndicatorResult> {
    try {
      await prisma.$queryRaw`SELECT 1`
      return this.getStatus(key, true)
    } catch (error) {
      throw new HealthCheckError(
        'Prisma check failed',
        this.getStatus(key, false, { message: error.message }),
      )
    }
  }
}
