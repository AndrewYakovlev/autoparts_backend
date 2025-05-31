// src/auth/strategies/jwt.strategy.ts
// JWT стратегия для Passport

import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PrismaService } from 'prisma/prisma.service'
import { Role } from '@prisma/client'

// Payload JWT токена
export interface JwtPayload {
  sub: string // ID пользователя
  phone?: string // Номер телефона
  role?: Role // Роль пользователя
  type: 'access' | 'refresh' | 'anonymous' // Тип токена
  sessionId?: string // ID сессии для анонимных пользователей
}

// Данные пользователя из JWT
export interface JwtUser {
  id: string
  phone?: string
  role?: Role
  isAnonymous: boolean
  sessionId?: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secretOrKey = configService.get<string>('jwt.accessSecret')

    if (!secretOrKey) {
      throw new Error('JWT access secret is not configured')
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
    })
  }

  // Валидация JWT payload
  async validate(payload: JwtPayload): Promise<JwtUser> {
    // Проверяем тип токена
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Неверный тип токена')
    }

    // Если это анонимный пользователь
    if (payload.type === 'access' && payload.sessionId) {
      const anonymousUser = await this.prisma.anonymousUser.findUnique({
        where: { sessionId: payload.sessionId },
      })

      if (!anonymousUser) {
        throw new UnauthorizedException('Анонимная сессия не найдена')
      }

      if (anonymousUser.expiresAt < new Date()) {
        throw new UnauthorizedException('Анонимная сессия истекла')
      }

      // Обновляем время последней активности
      await this.prisma.anonymousUser.update({
        where: { id: anonymousUser.id },
        data: { lastActivityAt: new Date() },
      })

      return {
        id: anonymousUser.id,
        isAnonymous: true,
        sessionId: anonymousUser.sessionId,
      }
    }

    // Если это обычный пользователь
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        phone: true,
        role: true,
        isActive: true,
      },
    })

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден')
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Пользователь заблокирован')
    }

    return {
      id: user.id,
      phone: user.phone,
      role: user.role,
      isAnonymous: false,
    }
  }
}
