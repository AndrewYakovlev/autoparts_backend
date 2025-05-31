// src/users/users.service.ts
// Сервис для управления пользователями

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from 'prisma/prisma.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { User, Role, Prisma } from '@prisma/client'
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateProfileDto,
  GetUsersFilterDto,
  UserResponseDto,
  UsersListResponseDto,
} from './dto/users.dto'
import { JwtUser } from '../auth/strategies/jwt.strategy'

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  // Получение профиля текущего пользователя
  async getMyProfile(currentUser: JwtUser): Promise<UserResponseDto> {
    if (currentUser.isAnonymous) {
      throw new ForbiddenException('Анонимные пользователи не имеют профиля')
    }

    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
    })

    if (!user) {
      throw new NotFoundException('Пользователь не найден')
    }

    return this.mapUserToResponse(user)
  }

  // Обновление собственного профиля
  async updateMyProfile(currentUser: JwtUser, dto: UpdateProfileDto): Promise<UserResponseDto> {
    if (currentUser.isAnonymous) {
      throw new ForbiddenException('Анонимные пользователи не могут обновлять профиль')
    }

    // Проверяем уникальность email, если он меняется
    if (dto.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          NOT: { id: currentUser.id },
        },
      })

      if (existingUser) {
        throw new ConflictException('Email уже используется')
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: currentUser.id },
      data: dto,
    })

    // Эмитим событие об обновлении профиля
    this.eventEmitter.emit('user.profile.updated', {
      userId: updatedUser.id,
      changes: dto,
    })

    return this.mapUserToResponse(updatedUser)
  }

  // Получение списка пользователей (для менеджеров и администраторов)
  async getUsers(filter: GetUsersFilterDto): Promise<UsersListResponseDto> {
    const { page, limit, sortBy, sortOrder, search, role, isActive } = filter
    const skip = (page - 1) * limit

    // Формируем условия фильтрации
    const where: Prisma.UserWhereInput = {}

    if (role) {
      where.role = role
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Получаем пользователей и общее количество
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.user.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      data: users.map((user) => this.mapUserToResponse(user)),
      total,
      page,
      limit,
      totalPages,
    }
  }

  // Получение пользователя по ID
  async getUserById(id: string, currentUser: JwtUser): Promise<UserResponseDto> {
    // Проверяем права доступа
    if (currentUser.role === Role.CUSTOMER && currentUser.id !== id) {
      throw new ForbiddenException('Недостаточно прав для просмотра профиля другого пользователя')
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      throw new NotFoundException('Пользователь не найден')
    }

    return this.mapUserToResponse(user)
  }

  // Создание пользователя (только для администраторов)
  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    // Проверяем уникальность телефона
    const existingUser = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    })

    if (existingUser) {
      throw new ConflictException('Пользователь с таким номером телефона уже существует')
    }

    // Проверяем уникальность email
    if (dto.email) {
      const emailExists = await this.prisma.user.findFirst({
        where: { email: dto.email },
      })

      if (emailExists) {
        throw new ConflictException('Email уже используется')
      }
    }

    const user = await this.prisma.user.create({
      data: dto,
    })

    // Эмитим событие о создании пользователя
    this.eventEmitter.emit('user.created', {
      userId: user.id,
      createdBy: 'admin',
    })

    return this.mapUserToResponse(user)
  }

  // Обновление пользователя (для менеджеров и администраторов)
  async updateUser(id: string, dto: UpdateUserDto, currentUser: JwtUser): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      throw new NotFoundException('Пользователь не найден')
    }

    // Проверяем права на изменение роли
    if (dto.role && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Только администраторы могут изменять роли')
    }

    // Нельзя понизить роль самому себе
    if (dto.role && currentUser.id === id && dto.role !== user.role) {
      throw new BadRequestException('Нельзя изменить свою роль')
    }

    // Проверяем уникальность email
    if (dto.email && dto.email !== user.email) {
      const emailExists = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          NOT: { id },
        },
      })

      if (emailExists) {
        throw new ConflictException('Email уже используется')
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dto,
    })

    // Эмитим событие об обновлении пользователя
    this.eventEmitter.emit('user.updated', {
      userId: updatedUser.id,
      updatedBy: currentUser.id,
      changes: dto,
    })

    return this.mapUserToResponse(updatedUser)
  }

  // Удаление пользователя (только для администраторов)
  async deleteUser(id: string, currentUser: JwtUser): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      throw new NotFoundException('Пользователь не найден')
    }

    // Нельзя удалить самого себя
    if (currentUser.id === id) {
      throw new BadRequestException('Нельзя удалить свой аккаунт')
    }

    // Soft delete - просто деактивируем пользователя
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    })

    // Отзываем все токены пользователя
    await this.prisma.refreshToken.updateMany({
      where: { userId: id },
      data: { isRevoked: true },
    })

    // Эмитим событие об удалении пользователя
    this.eventEmitter.emit('user.deleted', {
      userId: id,
      deletedBy: currentUser.id,
    })
  }

  // Получение статистики пользователей (для администраторов)
  async getUsersStats(): Promise<any> {
    const [totalUsers, activeUsers, usersByRole, recentRegistrations] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // За последние 30 дней
          },
        },
      }),
    ])

    return {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      byRole: usersByRole.reduce((acc, item) => {
        acc[item.role.toLowerCase()] = item._count
        return acc
      }, {}),
      recentRegistrations,
    }
  }

  // Приватные методы

  // Маппинг пользователя в DTO ответа
  private mapUserToResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      phone: user.phone,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
