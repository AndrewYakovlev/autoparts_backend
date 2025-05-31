// src/common/filters/http-exception.filter.ts
// Фильтр для обработки HTTP исключений

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Определяем статус и сообщение об ошибке
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Внутренняя ошибка сервера';
    let error = 'Internal Server Error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = exceptionResponse['message'] || message;
        error = exceptionResponse['error'] || error;
        details = exceptionResponse['details'];
      }
    } else if (exception instanceof Error) {
      message = exception.message;

      // Обработка ошибок Prisma
      if (exception.constructor.name === 'PrismaClientKnownRequestError') {
        const prismaError = exception as any;

        switch (prismaError.code) {
          case 'P2002':
            status = HttpStatus.CONFLICT;
            message = 'Запись с такими данными уже существует';
            error = 'Conflict';
            details = {
              field: prismaError.meta?.target,
            };
            break;
          case 'P2025':
            status = HttpStatus.NOT_FOUND;
            message = 'Запись не найдена';
            error = 'Not Found';
            break;
          case 'P2003':
            status = HttpStatus.BAD_REQUEST;
            message = 'Нарушение ссылочной целостности';
            error = 'Bad Request';
            break;
          default:
            status = HttpStatus.BAD_REQUEST;
            message = 'Ошибка базы данных';
            error = 'Database Error';
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
    };

    if (status >= 500) {
      this.logger.error(errorLog);
    } else {
      this.logger.warn(errorLog);
    }

    // Формируем ответ
    const errorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // В режиме разработки добавляем дополнительную информацию
    if (this.configService.get<string>('app.env') === 'development') {
      errorResponse['details'] = details;
      errorResponse['stack'] =
        exception instanceof Error ? exception.stack : undefined;
    }

    response.status(status).json(errorResponse);
  }
}
