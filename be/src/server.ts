import 'dotenv/config';
import { createApp } from './app';
import { config } from '@config/index';
import prisma from '@config/prisma';
import logger from '@config/logger';
import http from 'http';
import { SocketService } from '@services/socket.service';

async function bootstrap(): Promise<void> {
  // ── Verify database connection ─────────────────────────────────────────
  try {
    await prisma.$connect();
    logger.info('✅ Database connection established');
  } catch (err) {
    logger.error('❌ Failed to connect to the database', { err });
    process.exit(1);
  }

  // ── Start HTTP server ──────────────────────────────────────────────────
  const app = createApp();
  const server = http.createServer(app);

  SocketService.init(server);

  server.listen(config.app.port, () => {
    logger.info(
      `🚀 LMS API running on http://localhost:${config.app.port} [${config.app.env}]`,
    );
    logger.info(`📡 Health check: http://localhost:${config.app.port}/health`);
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`⚠️  ${signal} received — shutting down gracefully`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('💤 Database disconnected. Goodbye.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // ── Unhandled rejection guard ──────────────────────────────────────────
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection', { reason });
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { err });
    process.exit(1);
  });
}

bootstrap();
