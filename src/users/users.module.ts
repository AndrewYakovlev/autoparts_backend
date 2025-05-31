// src/users/users.module.ts
// Модуль для управления пользователями

import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Экспортируем для использования в других модулях
})
export class UsersModule {}
