// src/users/dto/users.dto.ts
// DTO для управления пользователями

import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger'
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { Role } from '@prisma/client'

// DTO для обновления профиля
export class UpdateProfileDto {
  @ApiProperty({
    description: 'Имя пользователя',
    example: 'Иван',
    required: false,
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  firstName?: string

  @ApiProperty({
    description: 'Фамилия пользователя',
    example: 'Иванов',
    required: false,
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  lastName?: string

  @ApiProperty({
    description: 'Email адрес',
    example: 'ivan@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Некорректный email адрес' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string
}

// DTO для обновления пользователя (для администраторов)
export class UpdateUserDto extends UpdateProfileDto {
  @ApiProperty({
    description: 'Роль пользователя',
    enum: Role,
    example: Role.CUSTOMER,
    required: false,
  })
  @IsOptional()
  @IsEnum(Role, { message: 'Некорректная роль' })
  role?: Role

  @ApiProperty({
    description: 'Активен ли пользователь',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

// DTO для создания пользователя (для администраторов)
export class CreateUserDto {
  @ApiProperty({
    description: 'Номер телефона в формате +7XXXXXXXXXX',
    example: '+79991234567',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  phone!: string

  @ApiProperty({
    description: 'Роль пользователя',
    enum: Role,
    example: Role.CUSTOMER,
    default: Role.CUSTOMER,
  })
  @IsEnum(Role)
  role: Role = Role.CUSTOMER

  @ApiProperty({
    description: 'Имя пользователя',
    example: 'Иван',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  firstName?: string

  @ApiProperty({
    description: 'Фамилия пользователя',
    example: 'Иванов',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  lastName?: string

  @ApiProperty({
    description: 'Email адрес',
    example: 'ivan@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string
}

// DTO для фильтрации пользователей
export class GetUsersFilterDto {
  @ApiProperty({
    description: 'Фильтр по роли',
    enum: Role,
    required: false,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role

  @ApiProperty({
    description: 'Фильтр по активности',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  isActive?: boolean

  @ApiProperty({
    description: 'Поиск по имени, фамилии или телефону',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string

  @ApiProperty({
    description: 'Номер страницы',
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1

  @ApiProperty({
    description: 'Количество элементов на странице',
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20

  @ApiProperty({
    description: 'Поле для сортировки',
    enum: ['createdAt', 'updatedAt', 'firstName', 'lastName', 'phone'],
    default: 'createdAt',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt'

  @ApiProperty({
    description: 'Направление сортировки',
    enum: ['asc', 'desc'],
    default: 'desc',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc'
}

// Response DTO для пользователя
export class UserResponseDto {
  @ApiProperty({
    description: 'ID пользователя',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string

  @ApiProperty({
    description: 'Номер телефона',
    example: '+79991234567',
  })
  phone!: string

  @ApiProperty({
    description: 'Роль пользователя',
    enum: Role,
    example: Role.CUSTOMER,
  })
  role!: Role

  @ApiProperty({
    description: 'Имя пользователя',
    example: 'Иван',
    nullable: true,
  })
  firstName?: string

  @ApiProperty({
    description: 'Фамилия пользователя',
    example: 'Иванов',
    nullable: true,
  })
  lastName?: string

  @ApiProperty({
    description: 'Email адрес',
    example: 'ivan@example.com',
    nullable: true,
  })
  email?: string

  @ApiProperty({
    description: 'Активен ли пользователь',
    example: true,
  })
  isActive!: boolean

  @ApiProperty({
    description: 'Дата последнего входа',
    example: '2024-01-01T00:00:00.000Z',
    nullable: true,
  })
  lastLoginAt?: Date

  @ApiProperty({
    description: 'Дата создания',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt!: Date

  @ApiProperty({
    description: 'Дата обновления',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt!: Date
}

// Response DTO для списка пользователей с пагинацией
export class UsersListResponseDto {
  @ApiProperty({
    description: 'Список пользователей',
    type: [UserResponseDto],
  })
  data!: UserResponseDto[]

  @ApiProperty({
    description: 'Общее количество пользователей',
    example: 100,
  })
  total!: number

  @ApiProperty({
    description: 'Текущая страница',
    example: 1,
  })
  page!: number

  @ApiProperty({
    description: 'Количество элементов на странице',
    example: 20,
  })
  limit!: number

  @ApiProperty({
    description: 'Общее количество страниц',
    example: 5,
  })
  totalPages!: number
}
