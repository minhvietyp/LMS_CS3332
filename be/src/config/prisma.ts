import { PrismaClient } from '@prisma/client';
import { config } from '@config/index';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Singleton Prisma Client.
 * In development, we attach the instance to `global` to avoid
 * exhausting connection pool on hot-reload (ts-node-dev).
 */
const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: config.app.isDevelopment ? ['query', 'warn', 'error'] : ['error'],
  });

if (config.app.isDevelopment) {
  global.__prisma = prisma;
}

export default prisma;
