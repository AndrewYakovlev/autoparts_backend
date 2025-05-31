// src/auth/guards/jwt-auth.guard.ts
// Guard для JWT авторизации

import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Reflector } from '@nestjs/core'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super()
  }

  canActivate(context: ExecutionContext) {
    // Проверяем, является ли эндпоинт публичным
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    return super.canActivate(context)
  }
}
