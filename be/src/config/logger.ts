import winston from 'winston';
import { config } from '@config/index';

const { combine, timestamp, colorize, printf, json } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${ts}] ${level}: ${message}${metaStr}`;
  }),
);

const prodFormat = combine(timestamp(), json());

const logger = winston.createLogger({
  level: config.app.isDevelopment ? 'debug' : 'info',
  format: config.app.isProduction ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
});

export default logger;
