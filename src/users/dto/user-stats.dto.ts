// src/users/dto/user-stats.dto.ts
// DTO для статистики пользователей

import { ApiProperty } from '@nestjs/swagger'

export class UserRoleStatsDto {
  @ApiProperty({
    description: 'Количество покупателей',
    example: 80,
  })
  customer!: number

  @ApiProperty({
    description: 'Количество менеджеров',
    example: 15,
  })
  manager!: number

  @ApiProperty({
    description: 'Количество администраторов',
    example: 5,
  })
  admin!: number
}

export class UserStatsResponseDto {
  @ApiProperty({
    description: 'Общее количество пользователей',
    example: 100,
  })
  total!: number

  @ApiProperty({
    description: 'Количество активных пользователей',
    example: 85,
  })
  active!: number

  @ApiProperty({
    description: 'Количество неактивных пользователей',
    example: 15,
  })
  inactive!: number

  @ApiProperty({
    description: 'Распределение пользователей по ролям',
    type: UserRoleStatsDto,
  })
  byRole!: UserRoleStatsDto

  @ApiProperty({
    description: 'Количество регистраций за последние 30 дней',
    example: 25,
  })
  recentRegistrations!: number
}
