// src/auth/auth.controller.ts
// Контроллер авторизации

import { Controller, Post, Body, HttpCode, HttpStatus, Delete } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger'
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
import {
  ApiWrappedOkResponse,
  ApiWrappedCreatedResponse,
  ApiNoContentResponse,
  ApiCommonErrors,
  ApiErrorResponse,
} from '@/common/decorators/swagger-response.decorator'

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
  @ApiWrappedOkResponse(RequestOtpResponseDto, 'OTP код успешно отправлен')
  @ApiErrorResponse(400, 'Некорректный номер телефона или слишком частые запросы')
  @ApiErrorResponse(429, 'Превышен лимит запросов')
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
  @ApiWrappedOkResponse(AuthResponseDto, 'Успешная авторизация')
  @ApiErrorResponse(401, 'Неверный или истекший OTP код')
  @ApiErrorResponse(429, 'Превышен лимит попыток')
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
  @ApiWrappedOkResponse(AuthResponseDto, 'Токены успешно обновлены')
  @ApiErrorResponse(401, 'Недействительный refresh токен')
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
  @ApiWrappedCreatedResponse(AnonymousSessionResponseDto, 'Анонимная сессия успешно создана')
  @ApiErrorResponse(429, 'Превышен лимит создания сессий')
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
  @ApiNoContentResponse('Успешный выход из системы')
  @ApiErrorResponse(401, 'Требуется авторизация')
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
  @ApiNoContentResponse('Успешный выход со всех устройств')
  @ApiErrorResponse(401, 'Требуется авторизация')
  async logoutAll(@CurrentUser() user: JwtUser): Promise<void> {
    await this.authService.logout(user.id)
  }
}
