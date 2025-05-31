// src/auth/guards/throttle.guard.ts
// Кастомный guard для rate limiting

import { Injectable, ExecutionContext } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { Reflector } from '@nestjs/core'

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(reflector: Reflector) {
    super({}, {}, reflector)
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()

    // Пропускаем health check эндпоинты
    if (request.url?.includes('/health')) {
      return true
    }

    const result = await super.canActivate(context)

    // Добавляем заголовки с информацией о лимитах
    const limit = this.getLimit(context)
    const ttl = this.getTtl(context)
    const remaining = await this.getRemaining(context)

    response.setHeader('X-RateLimit-Limit', limit)
    response.setHeader('X-RateLimit-Remaining', Math.max(0, remaining))
    response.setHeader('X-RateLimit-Reset', new Date(Date.now() + ttl * 1000).toISOString())

    return result
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Используем IP адрес как идентификатор для rate limiting
    return req.ip || req.connection.remoteAddress
  }

  private getLimit(context: ExecutionContext): number {
    // Здесь можно настроить разные лимиты для разных эндпоинтов
    const handler = context.getHandler()
    const controller = context.getClass()

    // Получаем кастомный лимит из декоратора, если есть
    const limit = this.reflector.getAllAndOverride<number>('throttle:limit', [handler, controller])

    return limit || 100 // Дефолтный лимит
  }

  private getTtl(context: ExecutionContext): number {
    // TTL в секундах
    const handler = context.getHandler()
    const controller = context.getClass()

    const ttl = this.reflector.getAllAndOverride<number>('throttle:ttl', [handler, controller])

    return ttl || 60 // Дефолтный TTL - 1 минута
  }

  private async getRemaining(context: ExecutionContext): Promise<number> {
    // Здесь должна быть логика подсчета оставшихся запросов
    // Для простоты возвращаем фиксированное значение
    return 50
  }
}
