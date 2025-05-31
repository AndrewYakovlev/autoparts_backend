// src/auth/guards/optional-auth.guard.ts
// Guard для опциональной авторизации (позволяет анонимным пользователям)

import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Вызываем родительский метод, но не выбрасываем исключение
    return super.canActivate(context)
  }

  handleRequest(err: any, user: any) {
    // Если есть ошибка или нет пользователя, возвращаем null
    // Это позволяет продолжить выполнение без авторизации
    if (err || !user) {
      return null
    }
    return user
  }
}
