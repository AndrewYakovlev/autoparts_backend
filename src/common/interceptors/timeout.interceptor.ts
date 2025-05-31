// src/common/interceptors/timeout.interceptor.ts
// Интерсептор для установки таймаута запросов

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly DEFAULT_TIMEOUT = 30000; // 30 секунд

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(this.DEFAULT_TIMEOUT),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () =>
              new RequestTimeoutException('Превышено время ожидания запроса'),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
