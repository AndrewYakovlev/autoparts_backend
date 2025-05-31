// src/auth/auth.service.ts
// Сервис авторизации

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from 'prisma/prisma.service'
import { User, OtpStatus, Role } from '@prisma/client'
import * as crypto from 'crypto'
import {
  RequestOtpDto,
  VerifyOtpDto,
  RefreshTokenDto,
  CreateAnonymousSessionDto,
} from './dto/auth.dto'
import { JwtPayload } from './strategies/jwt.strategy'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Запрос OTP кода
  async requestOtp(dto: RequestOtpDto, ipAddress: string, userAgent: string) {
    const { phone, deviceInfo } = dto

    // Проверяем, не было ли недавних запросов с этого номера
    const recentOtp = await this.prisma.otpCode.findFirst({
      where: {
        phone,
        status: OtpStatus.PENDING,
        createdAt: {
          gte: new Date(
            Date.now() - this.configService.get<number>('otp.resendTimeout', 3 * 60 * 1000),
          ),
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (recentOtp) {
      const timeLeft = Math.ceil(
        (recentOtp.createdAt.getTime() +
          this.configService.get<number>('otp.resendTimeout', 3 * 60 * 1000) -
          Date.now()) /
          1000,
      )
      throw new BadRequestException(`Повторная отправка возможна через ${timeLeft} секунд`)
    }

    // Генерируем OTP код
    const code = this.generateOtpCode()
    const expiresAt = new Date(
      Date.now() + this.configService.get<number>('otp.expiresIn', 5 * 60 * 1000),
    )

    // Проверяем, существует ли пользователь
    const user = await this.prisma.user.findUnique({
      where: { phone },
    })

    // Сохраняем OTP код
    await this.prisma.otpCode.create({
      data: {
        userId: user?.id,
        phone,
        code,
        expiresAt,
        ipAddress,
        userAgent,
      },
    })

    // Отправляем SMS или выводим в консоль
    if (this.configService.get<boolean>('otp.testMode')) {
      this.logger.log(`📱 OTP код для ${phone}: ${code}`)
    } else {
      // Здесь должна быть интеграция с SMS провайдером
      await this.sendSms(phone, `Ваш код подтверждения: ${code}`)
    }

    // Эмитим событие для аналитики
    this.eventEmitter.emit('auth.otp.requested', { phone, ipAddress })

    const response: {
      message: string
      resendAfter: number
      code?: string // Опциональное свойство
    } = {
      message: 'OTP код отправлен',
      resendAfter: this.configService.get<number>('otp.resendTimeout', 3 * 60 * 1000) / 1000,
    }

    // В тестовом режиме добавляем код в ответ
    if (this.configService.get<boolean>('otp.testMode')) {
      response['code'] = code
    }

    return response
  }

  // Подтверждение OTP кода
  async verifyOtp(dto: VerifyOtpDto, ipAddress: string, userAgent: string) {
    const { phone, code, deviceInfo } = dto

    // Находим активный OTP код
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        phone,
        code,
        status: OtpStatus.PENDING,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otpRecord) {
      // Увеличиваем счетчик неудачных попыток для последнего OTP
      await this.prisma.otpCode.updateMany({
        where: {
          phone,
          status: OtpStatus.PENDING,
        },
        data: {
          attemptCount: { increment: 1 },
        },
      })

      throw new UnauthorizedException('Неверный или истекший код')
    }

    // Проверяем количество попыток
    if (otpRecord.attemptCount >= this.configService.get<number>('otp.maxAttempts', 3)) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { status: OtpStatus.EXPIRED },
      })
      throw new UnauthorizedException('Превышено количество попыток')
    }

    // Начинаем транзакцию
    const result = await this.prisma.$transaction(async (tx) => {
      // Помечаем OTP как использованный
      await tx.otpCode.update({
        where: { id: otpRecord.id },
        data: {
          status: OtpStatus.USED,
          usedAt: new Date(),
        },
      })

      // Находим или создаем пользователя
      let user = await tx.user.findUnique({
        where: { phone },
      })

      if (!user) {
        user = await tx.user.create({
          data: {
            phone,
            role: Role.CUSTOMER,
          },
        })

        // Эмитим событие о регистрации
        this.eventEmitter.emit('auth.user.registered', {
          userId: user.id,
          phone,
        })
      }

      // Обновляем время последнего входа
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })

      // Создаем refresh токен
      const refreshToken = await this.createRefreshToken(
        tx,
        user.id,
        deviceInfo,
        ipAddress,
        userAgent,
      )

      return { user, refreshToken }
    })

    // Генерируем токены
    const tokens = await this.generateTokens(result.user)

    // Эмитим событие о входе
    this.eventEmitter.emit('auth.user.login', {
      userId: result.user.id,
      phone,
    })

    return {
      ...tokens,
      user: {
        id: result.user.id,
        phone: result.user.phone,
        role: result.user.role,
        firstName: result.user.firstName ?? undefined,
        lastName: result.user.lastName ?? undefined,
        email: result.user.email ?? undefined,
      },
    }
  }

  // Обновление токенов
  async refreshTokens(dto: RefreshTokenDto, ipAddress: string, userAgent: string) {
    const { refreshToken } = dto

    // Проверяем refresh токен
    let payload: JwtPayload
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      })
    } catch (error) {
      throw new UnauthorizedException('Недействительный refresh токен')
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Неверный тип токена')
    }

    // Хэшируем токен для поиска в БД
    const hashedToken = this.hashToken(refreshToken)

    // Находим токен в БД
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    })

    if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh токен недействителен или истек')
    }

    // Обновляем время последнего использования
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { lastUsedAt: new Date() },
    })

    // Генерируем новые токены
    const tokens = await this.generateTokens(tokenRecord.user)

    return {
      ...tokens,
      user: {
        id: tokenRecord.user.id,
        phone: tokenRecord.user.phone,
        role: tokenRecord.user.role,
        firstName: tokenRecord.user.firstName ?? undefined,
        lastName: tokenRecord.user.lastName ?? undefined,
        email: tokenRecord.user.email ?? undefined,
      },
    }
  }

  // Создание анонимной сессии
  async createAnonymousSession(dto: CreateAnonymousSessionDto, ipAddress: string) {
    const { deviceInfo } = dto
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней

    // Создаем анонимную сессию
    const anonymousUser = await this.prisma.anonymousUser.create({
      data: {
        sessionId,
        deviceInfo,
        ipAddress,
        expiresAt,
      },
    })

    // Генерируем токен для анонимной сессии
    const payload: JwtPayload = {
      sub: anonymousUser.id,
      type: 'access',
      sessionId: anonymousUser.sessionId,
    }

    const sessionToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.anonymousSecret'),
      expiresIn: this.configService.get<string>('jwt.anonymousExpiresIn'),
    })

    return {
      sessionToken,
      sessionId: anonymousUser.sessionId,
      expiresIn: 30 * 24 * 60 * 60, // 30 дней в секундах
    }
  }

  // Выход (отзыв refresh токена)
  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Отзываем конкретный токен
      const hashedToken = this.hashToken(refreshToken)
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          token: hashedToken,
        },
        data: { isRevoked: true },
      })
    } else {
      // Отзываем все токены пользователя
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      })
    }

    // Эмитим событие о выходе
    this.eventEmitter.emit('auth.user.logout', { userId })
  }

  // Приватные методы

  // Генерация OTP кода
  private generateOtpCode(): string {
    const length = this.configService.get<number>('otp.length') || 4 // значение по умолчанию
    const min = Math.pow(10, length - 1)
    const max = Math.pow(10, length) - 1
    return Math.floor(min + Math.random() * (max - min + 1)).toString()
  }

  // Генерация пары токенов
  private async generateTokens(user: User) {
    const accessPayload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      type: 'access',
    }

    const refreshPayload: JwtPayload = {
      sub: user.id,
      type: 'refresh',
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn'),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      }),
    ])

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 минут в секундах
      tokenType: 'Bearer',
    }
  }

  // Создание refresh токена в БД
  private async createRefreshToken(
    tx: any,
    userId: string,
    deviceInfo: any,
    ipAddress: string,
    userAgent: string,
  ) {
    // Генерируем уникальный токен
    const token = crypto.randomBytes(32).toString('hex')
    const hashedToken = this.hashToken(token)
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 дней

    await tx.refreshToken.create({
      data: {
        userId,
        token: hashedToken,
        deviceInfo,
        ipAddress,
        userAgent,
        expiresAt,
      },
    })

    return token
  }

  // Хэширование токена
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  // Отправка SMS (заглушка)
  private async sendSms(phone: string, message: string): Promise<void> {
    // Здесь должна быть интеграция с SMS провайдером
    this.logger.log(`SMS to ${phone}: ${message}`)
  }
}
