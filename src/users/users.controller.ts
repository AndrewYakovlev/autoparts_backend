// src/users/users.controller.ts
// Контроллер для управления пользователями

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateProfileDto,
  GetUsersFilterDto,
  UserResponseDto,
  UsersListResponseDto,
} from './dto/users.dto';
import {
  Auth,
  CurrentUser,
  AdminOnly,
  ManagerAccess,
} from '../auth/decorators';
import { JwtUser } from '../auth/strategies/jwt.strategy';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Эндпоинты для работы с собственным профилем

  @Get('profile')
  @Auth()
  @ApiOperation({
    summary: 'Получение своего профиля',
    description: 'Возвращает профиль текущего авторизованного пользователя',
  })
  @ApiResponse({
    status: 200,
    description: 'Профиль пользователя',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Требуется авторизация',
  })
  @ApiResponse({
    status: 403,
    description: 'Анонимные пользователи не имеют профиля',
  })
  async getMyProfile(@CurrentUser() user: JwtUser): Promise<UserResponseDto> {
    return this.usersService.getMyProfile(user);
  }

  @Put('profile')
  @Auth()
  @ApiOperation({
    summary: 'Обновление своего профиля',
    description: 'Обновляет профиль текущего авторизованного пользователя',
  })
  @ApiResponse({
    status: 200,
    description: 'Обновленный профиль',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Некорректные данные',
  })
  @ApiResponse({
    status: 401,
    description: 'Требуется авторизация',
  })
  @ApiResponse({
    status: 403,
    description: 'Анонимные пользователи не могут обновлять профиль',
  })
  @ApiResponse({
    status: 409,
    description: 'Email уже используется',
  })
  async updateMyProfile(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateMyProfile(user, dto);
  }

  // Эндпоинты для управления пользователями (для менеджеров и администраторов)

  @Get()
  @ManagerAccess()
  @ApiOperation({
    summary: 'Получение списка пользователей',
    description:
      'Возвращает список пользователей с фильтрацией и пагинацией. Доступно для менеджеров и администраторов.',
  })
  @ApiQuery({ type: GetUsersFilterDto })
  @ApiResponse({
    status: 200,
    description: 'Список пользователей',
    type: UsersListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Требуется авторизация',
  })
  @ApiResponse({
    status: 403,
    description: 'Недостаточно прав доступа',
  })
  async getUsers(
    @Query() filter: GetUsersFilterDto,
  ): Promise<UsersListResponseDto> {
    return this.usersService.getUsers(filter);
  }

  @Get('stats')
  @AdminOnly()
  @ApiOperation({
    summary: 'Статистика пользователей',
    description:
      'Возвращает статистику по пользователям. Доступно только для администраторов.',
  })
  @ApiResponse({
    status: 200,
    description: 'Статистика пользователей',
    schema: {
      example: {
        total: 100,
        active: 85,
        inactive: 15,
        byRole: {
          customer: 80,
          manager: 15,
          admin: 5,
        },
        recentRegistrations: 25,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Требуется авторизация',
  })
  @ApiResponse({
    status: 403,
    description: 'Доступно только для администраторов',
  })
  async getUsersStats() {
    return this.usersService.getUsersStats();
  }

  @Post()
  @AdminOnly()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Создание пользователя',
    description:
      'Создает нового пользователя. Доступно только для администраторов.',
  })
  @ApiResponse({
    status: 201,
    description: 'Пользователь успешно создан',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Некорректные данные',
  })
  @ApiResponse({
    status: 401,
    description: 'Требуется авторизация',
  })
  @ApiResponse({
    status: 403,
    description: 'Доступно только для администраторов',
  })
  @ApiResponse({
    status: 409,
    description: 'Пользователь с таким телефоном или email уже существует',
  })
  async createUser(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.createUser(dto);
  }

  @Get(':id')
  @Auth()
  @ApiOperation({
    summary: 'Получение пользователя по ID',
    description:
      'Возвращает информацию о пользователе. Покупатели могут видеть только свой профиль.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID пользователя',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Информация о пользователе',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Требуется авторизация',
  })
  @ApiResponse({
    status: 403,
    description: 'Недостаточно прав доступа',
  })
  @ApiResponse({
    status: 404,
    description: 'Пользователь не найден',
  })
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ): Promise<UserResponseDto> {
    return this.usersService.getUserById(id, user);
  }

  @Put(':id')
  @ManagerAccess()
  @ApiOperation({
    summary: 'Обновление пользователя',
    description:
      'Обновляет данные пользователя. Менеджеры не могут изменять роли.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID пользователя',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Обновленная информация о пользователе',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Некорректные данные или попытка изменить свою роль',
  })
  @ApiResponse({
    status: 401,
    description: 'Требуется авторизация',
  })
  @ApiResponse({
    status: 403,
    description: 'Недостаточно прав доступа',
  })
  @ApiResponse({
    status: 404,
    description: 'Пользователь не найден',
  })
  @ApiResponse({
    status: 409,
    description: 'Email уже используется',
  })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtUser,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser(id, dto, user);
  }

  @Delete(':id')
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удаление пользователя',
    description:
      'Деактивирует пользователя и отзывает все его токены. Доступно только для администраторов.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID пользователя',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Пользователь успешно удален',
  })
  @ApiResponse({
    status: 400,
    description: 'Попытка удалить свой аккаунт',
  })
  @ApiResponse({
    status: 401,
    description: 'Требуется авторизация',
  })
  @ApiResponse({
    status: 403,
    description: 'Доступно только для администраторов',
  })
  @ApiResponse({
    status: 404,
    description: 'Пользователь не найден',
  })
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    return this.usersService.deleteUser(id, user);
  }
}
