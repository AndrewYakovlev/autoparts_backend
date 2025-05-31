// prisma/seed.ts
// Скрипт для заполнения базы данных начальными данными

import { PrismaClient, Role } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем заполнение базы данных...');

  // Создаем тестовых пользователей
  const users = [
    {
      phone: '+79991234567',
      role: Role.ADMIN,
      firstName: 'Администратор',
      lastName: 'Системы',
      email: 'admin@autoparts.ru',
      isActive: true,
    },
    {
      phone: '+79991234568',
      role: Role.MANAGER,
      firstName: 'Менеджер',
      lastName: 'Иванов',
      email: 'manager@autoparts.ru',
      isActive: true,
    },
    {
      phone: '+79991234569',
      role: Role.CUSTOMER,
      firstName: 'Покупатель',
      lastName: 'Петров',
      email: 'customer@autoparts.ru',
      isActive: true,
    },
    {
      phone: '+79991234570',
      role: Role.CUSTOMER,
      firstName: 'Анна',
      lastName: 'Сидорова',
      email: 'anna@example.com',
      isActive: true,
    },
    {
      phone: '+79991234571',
      role: Role.CUSTOMER,
      firstName: 'Сергей',
      lastName: 'Козлов',
      isActive: true,
    },
  ];

  // Создаем пользователей
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { phone: userData.phone },
      update: {},
      create: userData,
    });
    console.log(
      `✅ Создан пользователь: ${user.firstName} ${user.lastName} (${user.role})`,
    );
  }

  // Создаем несколько анонимных сессий для тестирования
  const anonymousSessions = Array.from({ length: 5 }, (_, i) => ({
    sessionId: crypto.randomUUID(),
    deviceInfo: {
      platform: ['iOS', 'Android', 'Windows', 'MacOS', 'Linux'][i],
      browser: ['Safari', 'Chrome', 'Firefox', 'Edge', 'Opera'][i],
    },
    ipAddress: `192.168.1.${i + 1}`,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
  }));

  for (const sessionData of anonymousSessions) {
    const session = await prisma.anonymousUser.create({
      data: sessionData,
    });
    console.log(`✅ Создана анонимная сессия: ${session.sessionId}`);
  }

  // Создаем тестовые OTP коды (истекшие, для демонстрации очистки)
  const expiredOtpCodes = Array.from({ length: 10 }, (_, i) => ({
    phone: `+7999123456${i}`,
    code: String(1000 + i),
    status: 'EXPIRED' as const,
    expiresAt: new Date(Date.now() - 60 * 60 * 1000), // Истек час назад
    ipAddress: `192.168.1.${i + 10}`,
  }));

  for (const otpData of expiredOtpCodes) {
    await prisma.otpCode.create({
      data: otpData,
    });
  }
  console.log(`✅ Создано ${expiredOtpCodes.length} тестовых OTP кодов`);

  console.log('✨ База данных успешно заполнена!');

  // Выводим информацию для тестирования
  console.log('\n📱 Тестовые аккаунты:');
  console.log('─────────────────────');
  console.log('Администратор: +79991234567');
  console.log('Менеджер: +79991234568');
  console.log('Покупатель: +79991234569');
  console.log('\n💡 В режиме разработки OTP коды выводятся в консоль');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при заполнении базы данных:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
