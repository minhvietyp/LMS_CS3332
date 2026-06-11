import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  app: {
    port: parseInt(optionalEnv('PORT', '3000'), 10),
    env: optionalEnv('NODE_ENV', 'development'),
    isProduction: optionalEnv('NODE_ENV', 'development') === 'production',
    isDevelopment: optionalEnv('NODE_ENV', 'development') === 'development',
    jsonBodyLimit: optionalEnv('JSON_BODY_LIMIT', '100kb'),
    trustProxy: optionalEnv('TRUST_PROXY', 'false') === 'true',
    logLevel: optionalEnv(
      'LOG_LEVEL',
      optionalEnv('NODE_ENV', 'development') === 'development' ? 'debug' : 'info',
    ),
    slowRequestThresholdMs: parseInt(optionalEnv('SLOW_REQUEST_THRESHOLD_MS', '1000'), 10),
    version: optionalEnv('APP_VERSION', process.env.npm_package_version ?? '0.0.0'),
  },

  db: {
    url: requireEnv('DATABASE_URL'),
  },

  jwt: {
    accessSecret: requireEnv('JWT_ACCESS_SECRET'),
    accessExpiresIn: optionalEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshTokenDays: parseInt(optionalEnv('REFRESH_TOKEN_DAYS', '7'), 10),
    refreshCookieName: optionalEnv('REFRESH_COOKIE_NAME', 'refresh_token'),
  },

  bcrypt: {
    rounds: parseInt(optionalEnv('BCRYPT_ROUNDS', '12'), 10),
  },

  cors: {
    origins: optionalEnv('CORS_ORIGINS', 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim()),
  },

  rateLimit: {
    windowMs: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    max: parseInt(optionalEnv('RATE_LIMIT_MAX', '300'), 10),
    authWindowMs: parseInt(optionalEnv('AUTH_STRICT_WINDOW_MS', '900000'), 10),
    authMax: parseInt(optionalEnv('AUTH_STRICT_MAX', '10'), 10),
    publicWindowMs: parseInt(optionalEnv('PUBLIC_RATE_LIMIT_WINDOW_MS', '900000'), 10),
    publicMax: parseInt(optionalEnv('PUBLIC_RATE_LIMIT_MAX', '120'), 10),
  },

  cache: {
    enabled: optionalEnv('CACHE_ENABLED', 'true') === 'true',
    publicTtlMs: parseInt(optionalEnv('PUBLIC_CACHE_TTL_MS', '60000'), 10),
  },

  cloudinary: {
    cloudName: optionalEnv('CLOUDINARY_CLOUD_NAME', ''),
    apiKey: optionalEnv('CLOUDINARY_API_KEY', ''),
    apiSecret: optionalEnv('CLOUDINARY_API_SECRET', ''),
  },

  upload: {
    materialMaxSizeMb: parseInt(optionalEnv('MATERIAL_UPLOAD_MAX_MB', '100'), 10),
  },

  email: {
    host: optionalEnv('SMTP_HOST', ''),
    port: parseInt(optionalEnv('SMTP_PORT', '587'), 10),
    user: optionalEnv('SMTP_USER', ''),
    pass: optionalEnv('SMTP_PASS', ''),
    from: optionalEnv('EMAIL_FROM', 'noreply@lms.local'),
  },
};
