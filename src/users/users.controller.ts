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
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger'
import { Role } from '@prisma/client'
import { UsersService } from './users.service'
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateProfileDto,
  GetUsersFilterDto,
  UserResponseDto,
  UsersListResponseDto,
  UserStatsResponseDto,
} from './dto'
import { Auth, CurrentUser, AdminOnly, ManagerAccess } from '../auth/decorators'
import { JwtUser } from '../auth/strategies/jwt.strategy'
import {
  ApiWrappedOkResponse,
  ApiWrappedCreatedResponse,
  ApiNoContentResponse,
  ApiCommonErrors,
  ApiErrorResponse,
} from '@/common/decorators/swagger-response.decorator'

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
  @ApiWrappedOkResponse(UserResponseDto, 'Профиль пользователя')
  @ApiErrorResponse(401, 'Требуется авторизация')
  @ApiErrorResponse(403, 'Анонимные пользователи не имеют профиля')
  async getMyProfile(@CurrentUser() user: JwtUser): Promise<UserResponseDto> {
    return this.usersService.getMyProfile(user)
  }

  @Put('profile')
  @Auth()
  @ApiOperation({
    summary: 'Обновление своего профиля',
    description: 'Обновляет профиль текущего авторизованного пользователя',
  })
  @ApiWrappedOkResponse(UserResponseDto, 'Обновленный профиль')
  @ApiCommonErrors([400, 401, 403, 409])
  async updateMyProfile(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateMyProfile(user, dto)
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
  @ApiWrappedOkResponse(UsersListResponseDto, 'Список пользователей с пагинацией')
  @ApiCommonErrors([401, 403])
  async getUsers(@Query() filter: GetUsersFilterDto): Promise<UsersListResponseDto> {
    return this.usersService.getUsers(filter)
  }

  @Get('stats')
  @AdminOnly()
  @ApiOperation({
    summary: 'Статистика пользователей',
    description: 'Возвращает статистику по пользователям. Доступно только для администраторов.',
  })
  @ApiWrappedOkResponse(UserStatsResponseDto, 'Статистика пользователей')
  @ApiCommonErrors([401, 403])
  async getUsersStats(): Promise<UserStatsResponseDto> {
    return this.usersService.getUsersStats()
  }

  @Post()
  @AdminOnly()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Создание пользователя',
    description: 'Создает нового пользователя. Доступно только для администраторов.',
  })
  @ApiWrappedCreatedResponse(UserResponseDto, 'Пользователь успешно создан')
  @ApiCommonErrors([400, 401, 403, 409])
  async createUser(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.createUser(dto)
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
  @ApiWrappedOkResponse(UserResponseDto, 'Информация о пользователе')
  @ApiCommonErrors([401, 403, 404])
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ): Promise<UserResponseDto> {
    return this.usersService.getUserById(id, user)
  }

  @Put(':id')
  @ManagerAccess()
  @ApiOperation({
    summary: 'Обновление пользователя',
    description: 'Обновляет данные пользователя. Менеджеры не могут изменять роли.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID пользователя',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiWrappedOkResponse(UserResponseDto, 'Обновленная информация о пользователе')
  @ApiCommonErrors([400, 401, 403, 404, 409])
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtUser,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser(id, dto, user)
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
  @ApiNoContentResponse('Пользователь успешно удален')
  @ApiCommonErrors([400, 401, 403, 404])
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    return this.usersService.deleteUser(id, user)
  }
}
