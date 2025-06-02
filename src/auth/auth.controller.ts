// src/auth/auth.controller.ts
// Контроллер авторизации

import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Delete } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger'
import { Throttle, SkipThrottle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import {
  RequestOtpDto,
  VerifyOtpDto,
  RefreshTokenDto,
  CreateAnonymousSessionDto,
  AuthResponseDto,
  RequestOtpResponseDto,
  AnonymousSessionResponseDto,
} from './dto/auth.dto'
import { CurrentUser, IpAddress, UserAgent, Public, Auth } from './decorators'
import { JwtUser } from './strategies/jwt.strategy'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 3600 } }) // 5 запросов в час на IP
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Запрос OTP кода',
    description: 'Отправляет OTP код на указанный номер телефона для авторизации',
  })
  @ApiBody({ type: RequestOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP код успешно отправлен',
    type: RequestOtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Некорректный номер телефона или слишком частые запросы',
  })
  @ApiResponse({
    status: 429,
    description: 'Превышен лимит запросов',
  })
  async requestOtp(
    @Body() dto: RequestOtpDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ): Promise<RequestOtpResponseDto> {
    return this.authService.requestOtp(dto, ipAddress, userAgent)
  }

  @Post('otp/verify')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 3600 } }) // 10 попыток в час на IP
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Подтверждение OTP кода',
    description: 'Проверяет OTP код и возвращает токены доступа',
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Успешная авторизация',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Неверный или истекший OTP код',
  })
  @ApiResponse({
    status: 429,
    description: 'Превышен лимит попыток',
  })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ): Promise<AuthResponseDto> {
    return this.authService.verifyOtp(dto, ipAddress, userAgent)
  }

  @Post('token/refresh')
  @Public()
  @SkipThrottle() // Не ограничиваем обновление токенов
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Обновление токенов',
    description: 'Обновляет access токен используя refresh токен',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Токены успешно обновлены',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Недействительный refresh токен',
  })
  async refreshTokens(
    @Body() dto: RefreshTokenDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(dto, ipAddress, userAgent)
  }

  @Post('anonymous')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 3600 } }) // 10 сессий в час на IP
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Создание анонимной сессии',
    description: 'Создает анонимную сессию для неавторизованных пользователей',
  })
  @ApiBody({ type: CreateAnonymousSessionDto })
  @ApiResponse({
    status: 201,
    description: 'Анонимная сессия успешно создана',
    type: AnonymousSessionResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Превышен лимит создания сессий',
  })
  async createAnonymousSession(
    @Body() dto: CreateAnonymousSessionDto,
    @IpAddress() ipAddress: string,
  ): Promise<AnonymousSessionResponseDto> {
    return this.authService.createAnonymousSession(dto, ipAddress)
  }

  @Delete('logout')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Выход из системы',
    description: 'Отзывает все refresh токены пользователя',
  })
  @ApiResponse({
    status: 204,
    description: 'Успешный выход из системы',
  })
  @ApiResponse({
    status: 401,
    description: 'Требуется авторизация',
  })
  async logout(
    @CurrentUser() user: JwtUser,
    @Body('refreshToken') refreshToken?: string,
  ): Promise<void> {
    await this.authService.logout(user.id, refreshToken)
  }

  @Post('logout/all')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Выход со всех устройств',
    description: 'Отзывает все refresh токены пользователя на всех устройствах',
  })
  @ApiResponse({
    status: 204,
    description: 'Успешный выход со всех устройств',
  })
  @ApiResponse({
    status: 401,
    description: 'Требуется авторизация',
  })
  async logoutAll(@CurrentUser() user: JwtUser): Promise<void> {
    await this.authService.logout(user.id)
  }
}
