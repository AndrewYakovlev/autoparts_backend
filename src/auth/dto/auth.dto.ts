// src/auth/dto/auth.dto.ts
// DTO для авторизации

import { ApiProperty } from '@nestjs/swagger'
import {
  IsString,
  Matches,
  Length,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsObject,
} from 'class-validator'
import { Transform } from 'class-transformer'

// DTO для запроса OTP кода
export class RequestOtpDto {
  @ApiProperty({
    description: 'Номер телефона в формате +7XXXXXXXXXX',
    example: '+79991234567',
    pattern: '^\\+7\\d{10}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+7\d{10}$/, {
    message: 'Номер телефона должен быть в формате +7XXXXXXXXXX',
  })
  @Transform(({ value }) => value?.trim())
  phone: string

  @ApiProperty({
    description: 'Информация об устройстве (опционально)',
    example: { platform: 'iOS', version: '15.0', browser: 'Safari' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>
}

// DTO для подтверждения OTP кода
export class VerifyOtpDto {
  @ApiProperty({
    description: 'Номер телефона в формате +7XXXXXXXXXX',
    example: '+79991234567',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+7\d{10}$/, {
    message: 'Номер телефона должен быть в формате +7XXXXXXXXXX',
  })
  @Transform(({ value }) => value?.trim())
  phone: string

  @ApiProperty({
    description: '4-значный OTP код',
    example: '1234',
    minLength: 4,
    maxLength: 4,
  })
  @IsString()
  @IsNotEmpty()
  @Length(4, 4, { message: 'OTP код должен состоять из 4 цифр' })
  @Matches(/^\d{4}$/, { message: 'OTP код должен содержать только цифры' })
  code: string

  @ApiProperty({
    description: 'Информация об устройстве (опционально)',
    example: { platform: 'iOS', version: '15.0', browser: 'Safari' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>
}

// DTO для обновления токенов
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh токен',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string
}

// DTO для создания анонимной сессии
export class CreateAnonymousSessionDto {
  @ApiProperty({
    description: 'Информация об устройстве (опционально)',
    example: { platform: 'Android', version: '12', browser: 'Chrome' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>
}

// Response DTO для успешной авторизации
export class AuthResponseDto {
  @ApiProperty({
    description: 'Access токен для доступа к API',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string

  @ApiProperty({
    description: 'Refresh токен для обновления access токена',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string

  @ApiProperty({
    description: 'Время жизни access токена в секундах',
    example: 900,
  })
  expiresIn: number

  @ApiProperty({
    description: 'Тип токена',
    example: 'Bearer',
  })
  tokenType: string = 'Bearer'

  @ApiProperty({
    description: 'Информация о пользователе',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      phone: '+79991234567',
      role: 'CUSTOMER',
      firstName: 'Иван',
      lastName: 'Иванов',
    },
  })
  user: {
    id: string
    phone: string
    role: string
    firstName?: string
    lastName?: string
    email?: string
  }
}

// Response DTO для запроса OTP
export class RequestOtpResponseDto {
  @ApiProperty({
    description: 'Сообщение о статусе отправки',
    example: 'OTP код отправлен',
  })
  message: string

  @ApiProperty({
    description: 'Время до возможности повторной отправки в секундах',
    example: 180,
  })
  resendAfter: number

  @ApiProperty({
    description: 'OTP код (только в режиме разработки)',
    example: '1234',
    required: false,
  })
  code?: string
}

// Response DTO для анонимной сессии
export class AnonymousSessionResponseDto {
  @ApiProperty({
    description: 'Токен анонимной сессии',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  sessionToken: string

  @ApiProperty({
    description: 'ID анонимной сессии',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  sessionId: string

  @ApiProperty({
    description: 'Время жизни сессии в секундах',
    example: 2592000, // 30 дней
  })
  expiresIn: number
}
