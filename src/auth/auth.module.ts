// src/auth/auth.module.ts
// Модуль авторизации

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { OptionalAuthGuard } from './guards/optional-auth.guard';

@Module({
  imports: [
    // Passport для стратегий авторизации
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT модуль с динамической конфигурацией
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessExpiresIn'),
          issuer: 'autoparts-api',
          audience: 'autoparts-client',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    OptionalAuthGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, OptionalAuthGuard],
})
export class AuthModule {}
