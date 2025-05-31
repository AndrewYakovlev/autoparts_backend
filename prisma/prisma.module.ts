// src/prisma/prisma.module.ts
// Модуль для работы с Prisma ORM

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Делаем модуль глобальным для доступа из любого места
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
