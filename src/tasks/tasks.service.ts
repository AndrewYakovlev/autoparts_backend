// src/tasks/tasks.service.ts
// Сервис для выполнения периодических задач

import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from 'prisma/prisma.service'
import { EventEmitter2 } from '@nestjs/event-emitter'

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name)

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  // Очистка истекших OTP кодов - каждые 30 минут
  @Cron(CronExpression.EVERY_30_MINUTES)
  async cleanupExpiredOtp() {
    try {
      const result = await this.prisma.otpCode.deleteMany({
        where: {
          OR: [{ expiresAt: { lte: new Date() } }, { status: { in: ['USED', 'EXPIRED'] } }],
        },
      })

      if (result.count > 0) {
        this.logger.log(`Удалено ${result.count} истекших OTP кодов`)
        this.eventEmitter.emit('tasks.otp.cleaned', { count: result.count })
      }
    } catch (error) {
      this.logger.error('Ошибка при очистке OTP кодов', error)
    }
  }

  // Очистка истекших refresh токенов - каждый час
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredRefreshTokens() {
    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lte: new Date() } },
            {
              isRevoked: true,
              createdAt: {
                lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Старше 7 дней
              },
            },
          ],
        },
      })

      if (result.count > 0) {
        this.logger.log(`Удалено ${result.count} истекших refresh токенов`)
        this.eventEmitter.emit('tasks.tokens.cleaned', { count: result.count })
      }
    } catch (error) {
      this.logger.error('Ошибка при очистке refresh токенов', error)
    }
  }

  // Очистка истекших анонимных сессий - каждые 6 часов
  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupExpiredAnonymousSessions() {
    try {
      const result = await this.prisma.anonymousUser.deleteMany({
        where: {
          expiresAt: { lte: new Date() },
        },
      })

      if (result.count > 0) {
        this.logger.log(`Удалено ${result.count} истекших анонимных сессий`)
        this.eventEmitter.emit('tasks.anonymous.cleaned', {
          count: result.count,
        })
      }
    } catch (error) {
      this.logger.error('Ошибка при очистке анонимных сессий', error)
    }
  }

  // Обновление статистики - каждый день в 3:00
  @Cron('0 3 * * *')
  async updateDailyStats() {
    try {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)

      // Подсчет статистики за день
      const [newUsers, activeUsers, totalLogins, otpRequests] = await Promise.all([
        // Новые пользователи за день
        this.prisma.user.count({
          where: {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        }),
        // Активные пользователи за день
        this.prisma.user.count({
          where: {
            lastLoginAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        }),
        // Количество входов за день
        this.prisma.refreshToken.count({
          where: {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        }),
        // Количество запросов OTP за день
        this.prisma.otpCode.count({
          where: {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        }),
      ])

      const stats = {
        date: startOfDay,
        newUsers,
        activeUsers,
        totalLogins,
        otpRequests,
      }

      this.logger.log(`Статистика за ${startOfDay.toDateString()}:`, stats)
      this.eventEmitter.emit('tasks.stats.daily', stats)
    } catch (error) {
      this.logger.error('Ошибка при обновлении статистики', error)
    }
  }

  // Проверка и деактивация неактивных пользователей - каждую неделю
  @Cron('0 2 * * 0') // Воскресенье в 2:00
  async checkInactiveUsers() {
    try {
      const inactivityThreshold = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 дней

      // Находим неактивных пользователей
      const inactiveUsers = await this.prisma.user.findMany({
        where: {
          isActive: true,
          lastLoginAt: {
            lte: inactivityThreshold,
          },
        },
        select: {
          id: true,
          phone: true,
          lastLoginAt: true,
        },
      })

      if (inactiveUsers.length > 0) {
        this.logger.warn(`Найдено ${inactiveUsers.length} неактивных пользователей`)

        // Эмитим событие для каждого неактивного пользователя
        for (const user of inactiveUsers) {
          this.eventEmitter.emit('user.inactive.detected', {
            userId: user.id,
            phone: user.phone,
            lastLoginAt: user.lastLoginAt,
          })
        }
      }
    } catch (error) {
      this.logger.error('Ошибка при проверке неактивных пользователей', error)
    }
  }
}
