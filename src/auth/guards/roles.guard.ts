// src/auth/guards/roles.guard.ts
// Guard для проверки ролей

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '@prisma/client'
import { ROLES_KEY } from '../decorators'
import { JwtUser } from '../strategies/jwt.strategy'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Получаем требуемые роли из метаданных
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    // Получаем пользователя из request
    const { user } = context.switchToHttp().getRequest()
    const jwtUser = user as JwtUser

    // Анонимные пользователи не имеют ролей
    if (jwtUser?.isAnonymous) {
      return false
    }

    // Проверяем, есть ли у пользователя требуемая роль
    if (!jwtUser?.role) {
      return false
    }
    return requiredRoles.includes(jwtUser.role)
  }
}
