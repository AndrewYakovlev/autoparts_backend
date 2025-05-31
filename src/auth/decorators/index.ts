// src/auth/decorators/index.ts
// Декораторы для авторизации

import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
  applyDecorators,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger'
import { Role } from '@prisma/client'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { RolesGuard } from '../guards/roles.guard'
import { OptionalAuthGuard } from '../guards/optional-auth.guard'
import { JwtUser } from '../strategies/jwt.strategy'

// Ключ для метаданных ролей
export const ROLES_KEY = 'roles'

// Декоратор для установки требуемых ролей
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)

// Декоратор для получения текущего пользователя из request
export const CurrentUser = createParamDecorator(
  (data: keyof JwtUser | undefined, ctx: ExecutionContext): JwtUser | any => {
    const request = ctx.switchToHttp().getRequest()
    const user = request.user as JwtUser

    return data ? user?.[data] : user
  },
)

// Декоратор для обязательной авторизации
export const Auth = (...roles: Role[]) => {
  const decorators = [
    UseGuards(JwtAuthGuard),
    ApiBearerAuth('JWT-auth'),
    ApiUnauthorizedResponse({ description: 'Требуется авторизация' }),
  ]

  // Если указаны роли, добавляем проверку ролей
  if (roles.length > 0) {
    decorators.push(
      Roles(...roles),
      UseGuards(RolesGuard),
      ApiForbiddenResponse({ description: 'Недостаточно прав доступа' }),
    )
  }

  return applyDecorators(...decorators)
}

// Декоратор для опциональной авторизации (для анонимных пользователей)
export const OptionalAuth = () => {
  return applyDecorators(UseGuards(OptionalAuthGuard), ApiBearerAuth('JWT-auth'))
}

// Декоратор для публичных эндпоинтов
export const Public = () => SetMetadata('isPublic', true)

// Декоратор для проверки, является ли пользователь владельцем ресурса
export const IsOwner = createParamDecorator(
  (resourceIdParam: string = 'id', ctx: ExecutionContext): boolean => {
    const request = ctx.switchToHttp().getRequest()
    const user = request.user as JwtUser
    const resourceId = request.params[resourceIdParam]

    // Если пользователь анонимный, он не может быть владельцем
    if (user?.isAnonymous) {
      return false
    }

    // Проверяем, совпадает ли ID пользователя с ID ресурса
    return user?.id === resourceId
  },
)

// Декоратор для получения IP адреса
export const IpAddress = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest()
  return request.ip || request.connection.remoteAddress
})

// Декоратор для получения User-Agent
export const UserAgent = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest()
  return request.headers['user-agent'] || ''
})

// Декоратор для эндпоинтов только для администраторов
export const AdminOnly = () => Auth(Role.ADMIN)

// Декоратор для эндпоинтов для менеджеров и администраторов
export const ManagerAccess = () => Auth(Role.MANAGER, Role.ADMIN)

// Декоратор для эндпоинтов для авторизованных пользователей
export const AuthorizedOnly = () => Auth()
