// src/common/decorators/swagger-response.decorator.ts
// Полный набор декораторов для правильной документации всех типов ответов

import { Type, applyDecorators } from '@nestjs/common'
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger'

// ========================================
// Базовые декораторы для разных статусов
// ========================================

// 200 OK - для GET, PUT, PATCH
export const ApiWrappedOkResponse = <T extends Type<any>>(
  model: T,
  description = 'Успешный ответ',
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status: 200,
      description,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { $ref: getSchemaPath(model) },
              timestamp: { type: 'string', example: '2024-06-02T12:00:00.000Z' },
              path: { type: 'string', example: '/api/v1/resource' },
            },
            required: ['success', 'data', 'timestamp', 'path'],
          },
        },
      },
    }),
  )
}

// 201 Created - для POST
export const ApiWrappedCreatedResponse = <T extends Type<any>>(
  model: T,
  description = 'Ресурс успешно создан',
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status: 201,
      description,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { $ref: getSchemaPath(model) },
              timestamp: { type: 'string', example: '2024-06-02T12:00:00.000Z' },
              path: { type: 'string', example: '/api/v1/resource' },
            },
            required: ['success', 'data', 'timestamp', 'path'],
          },
        },
      },
    }),
  )
}

// 204 No Content - для DELETE (без обертки)
export const ApiNoContentResponse = (description = 'Операция выполнена успешно') => {
  return ApiResponse({
    status: 204,
    description,
  })
}

// ========================================
// Специализированные декораторы
// ========================================

// Для массивов
export const ApiWrappedArrayResponse = <T extends Type<any>>(
  model: T,
  description = 'Список элементов',
  status = 200,
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      description,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              timestamp: { type: 'string', example: '2024-06-02T12:00:00.000Z' },
              path: { type: 'string', example: '/api/v1/resources' },
            },
            required: ['success', 'data', 'timestamp', 'path'],
          },
        },
      },
    }),
  )
}

// Для пагинированных ответов
export const ApiWrappedPaginatedResponse = <T extends Type<any>>(
  model: T,
  description = 'Список с пагинацией',
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status: 200,
      description,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { $ref: getSchemaPath(model) },
                  },
                  total: { type: 'number', example: 100 },
                  page: { type: 'number', example: 1 },
                  limit: { type: 'number', example: 20 },
                  totalPages: { type: 'number', example: 5 },
                },
                required: ['data', 'total', 'page', 'limit', 'totalPages'],
              },
              timestamp: { type: 'string', example: '2024-06-02T12:00:00.000Z' },
              path: { type: 'string', example: '/api/v1/resources?page=1&limit=20' },
            },
            required: ['success', 'data', 'timestamp', 'path'],
          },
        },
      },
    }),
  )
}

// ========================================
// Декораторы для ошибок
// ========================================

// Базовая схема ошибки
const ErrorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    message: { type: 'string' },
    error: { type: 'string' },
    timestamp: { type: 'string' },
    path: { type: 'string' },
  },
  required: ['statusCode', 'message', 'error', 'timestamp', 'path'],
}

// Единичная ошибка
export const ApiErrorResponse = (status: number, description: string, example?: any) => {
  const defaultExamples: Record<number, any> = {
    400: {
      statusCode: 400,
      message: 'Некорректные данные запроса',
      error: 'Bad Request',
      timestamp: '2024-06-02T12:00:00.000Z',
      path: '/api/v1/resource',
    },
    401: {
      statusCode: 401,
      message: 'Требуется авторизация',
      error: 'Unauthorized',
      timestamp: '2024-06-02T12:00:00.000Z',
      path: '/api/v1/resource',
    },
    403: {
      statusCode: 403,
      message: 'Недостаточно прав доступа',
      error: 'Forbidden',
      timestamp: '2024-06-02T12:00:00.000Z',
      path: '/api/v1/resource',
    },
    404: {
      statusCode: 404,
      message: 'Ресурс не найден',
      error: 'Not Found',
      timestamp: '2024-06-02T12:00:00.000Z',
      path: '/api/v1/resource',
    },
    409: {
      statusCode: 409,
      message: 'Конфликт данных',
      error: 'Conflict',
      timestamp: '2024-06-02T12:00:00.000Z',
      path: '/api/v1/resource',
    },
    429: {
      statusCode: 429,
      message: 'Слишком много запросов',
      error: 'Too Many Requests',
      timestamp: '2024-06-02T12:00:00.000Z',
      path: '/api/v1/resource',
    },
  }

  return ApiResponse({
    status,
    description,
    content: {
      'application/json': {
        schema: ErrorSchema,
        example: example || defaultExamples[status] || defaultExamples[400],
      },
    },
  })
}

// Множественные ошибки
export const ApiCommonErrors = (statuses: number[] = [400, 401, 403, 404]) => {
  const decorators = statuses.map((status) => {
    const descriptions: Record<number, string> = {
      400: 'Некорректные данные запроса',
      401: 'Требуется авторизация',
      403: 'Недостаточно прав доступа',
      404: 'Ресурс не найден',
      409: 'Конфликт данных',
      429: 'Превышен лимит запросов',
      500: 'Внутренняя ошибка сервера',
    }

    return ApiErrorResponse(status, descriptions[status] || 'Ошибка')
  })

  return applyDecorators(...decorators)
}

// ========================================
// Универсальный декоратор (опционально)
// ========================================

interface ApiWrappedOptions<T> {
  type: Type<T> | [Type<T>]
  status?: 200 | 201
  description?: string
  isPaginated?: boolean
  errors?: number[]
}

export const ApiWrapped = <T extends Type<any>>(options: ApiWrappedOptions<T>) => {
  const {
    type,
    status = 200,
    description = 'Успешный ответ',
    isPaginated = false,
    errors = [400, 401, 403, 404],
  } = options

  const decorators = []

  // Успешный ответ
  if (Array.isArray(type)) {
    decorators.push(ApiWrappedArrayResponse(type[0], description, status))
  } else if (isPaginated) {
    decorators.push(ApiWrappedPaginatedResponse(type, description))
  } else if (status === 201) {
    decorators.push(ApiWrappedCreatedResponse(type, description))
  } else {
    decorators.push(ApiWrappedOkResponse(type, description))
  }

  // Ошибки
  if (errors.length > 0) {
    decorators.push(ApiCommonErrors(errors))
  }

  return applyDecorators(...decorators)
}

// ========================================
// Примеры использования
// ========================================

/*
// GET - одиночный объект
@Get(':id')
@ApiWrappedOkResponse(UserDto, 'Информация о пользователе')
@ApiCommonErrors([401, 403, 404])
async getUser(@Param('id') id: string) { }

// GET - массив
@Get()
@ApiWrappedArrayResponse(UserDto, 'Список пользователей')
@ApiCommonErrors([401, 403])
async getUsers() { }

// GET - пагинация
@Get()
@ApiWrappedPaginatedResponse(UserDto, 'Список пользователей с пагинацией')
@ApiCommonErrors([401, 403])
async getUsersPaginated() { }

// POST - создание
@Post()
@ApiWrappedCreatedResponse(UserDto, 'Пользователь создан')
@ApiCommonErrors([400, 401, 403, 409])
async createUser(@Body() dto: CreateUserDto) { }

// PUT - обновление
@Put(':id')
@ApiWrappedOkResponse(UserDto, 'Пользователь обновлен')
@ApiCommonErrors([400, 401, 403, 404, 409])
async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) { }

// DELETE - удаление
@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)
@ApiNoContentResponse('Пользователь удален')
@ApiCommonErrors([401, 403, 404])
async deleteUser(@Param('id') id: string) { }

// Или используйте универсальный декоратор:

@Post()
@ApiWrapped({
  type: UserDto,
  status: 201,
  description: 'Пользователь создан',
  errors: [400, 401, 403, 409]
})
async createUser(@Body() dto: CreateUserDto) { }
*/
