// src/common/filters/http-exception.filter.ts
// Фильтр для обработки HTTP исключений

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { ConfigService } from '@nestjs/config'

// Интерфейс для ответа исключения
interface ExceptionResponseObject {
  message?: string | string[]
  error?: string
  details?: any
  statusCode?: number
}

// Интерфейс для ответа об ошибке
interface ErrorResponse {
  statusCode: number
  message: string
  error: string
  timestamp: string
  path: string
  details?: any
  stack?: string
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    // Определяем статус и сообщение об ошибке
    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Внутренняя ошибка сервера'
    let error = 'Internal Server Error'
    let details: any = undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as ExceptionResponseObject
        // Обрабатываем случай, когда message может быть массивом
        if (Array.isArray(responseObj.message)) {
          message = responseObj.message.join(', ')
        } else if (responseObj.message) {
          message = responseObj.message
        }
        error = responseObj.error || error
        details = responseObj.details
      }
    } else if (exception instanceof Error) {
      message = exception.message

      // Обработка ошибок Prisma
      if (exception.constructor.name === 'PrismaClientKnownRequestError') {
        const prismaError = exception as any

        switch (prismaError.code) {
          case 'P2002':
            status = HttpStatus.CONFLICT
            message = 'Запись с такими данными уже существует'
            error = 'Conflict'
            details = {
              field: prismaError.meta?.target,
            }
            break
          case 'P2025':
            status = HttpStatus.NOT_FOUND
            message = 'Запись не найдена'
            error = 'Not Found'
            break
          case 'P2003':
            status = HttpStatus.BAD_REQUEST
            message = 'Нарушение ссылочной целостности'
            error = 'Bad Request'
            break
          default:
            status = HttpStatus.BAD_REQUEST
            message = 'Ошибка базы данных'
            error = 'Database Error'
        }
      }
    }

    // Логируем ошибку
    const errorLog = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      status,
      message,
      exception: exception instanceof Error ? exception.stack : exception,
    }

    if (status >= 500) {
      this.logger.error(errorLog)
    } else {
      this.logger.warn(errorLog)
    }

    // Формируем ответ
    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    }

    // В режиме разработки добавляем дополнительную информацию
    if (this.configService.get<string>('app.env', 'production') === 'development') {
      errorResponse.details = details
      errorResponse.stack = exception instanceof Error ? exception.stack : undefined
    }

    response.status(status).json(errorResponse)
  }
}
