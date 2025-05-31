// src/tasks/tasks.module.ts
// Модуль для периодических задач

import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';

@Module({
  providers: [TasksService],
})
export class TasksModule {}
