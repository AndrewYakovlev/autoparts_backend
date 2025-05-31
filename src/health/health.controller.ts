// src/health/health.controller.ts
// Контроллер для проверки состояния приложения

import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeController } from '@nestjs/swagger'
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus'
import { PrismaService } from 'prisma/prisma.service'
import { Public } from '../auth/decorators'

@ApiTags('health')
@ApiExcludeController() // Исключаем из Swagger документации
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Проверка состояния приложения' })
  @ApiResponse({ status: 200, description: 'Приложение работает нормально' })
  @ApiResponse({ status: 503, description: 'Приложение недоступно' })
  check() {
    return this.health.check([() => this.prismaHealth.pingCheck('database', this.prisma)])
  }

  @Get('ping')
  @Public()
  @ApiOperation({ summary: 'Простая проверка доступности' })
  @ApiResponse({ status: 200, description: 'Pong' })
  ping() {
    return { message: 'pong', timestamp: new Date().toISOString() }
  }
}
