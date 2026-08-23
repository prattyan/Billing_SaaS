import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  baseUrl: process.env.APP_BASE_URL ?? 'https://billing-saas-web.onrender.com',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000', 'https://billing-saas-web.onrender.com'],
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
}));

export const jwtConfig = registerAs('jwt', () => {
  const isProd = process.env.NODE_ENV === 'production';
  const secret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (isProd && (!secret || secret === 'dev_secret_change_in_production')) {
    throw new Error('CRITICAL SECURITY ALERT: JWT_SECRET environment variable must be explicitly defined in production!');
  }
  if (isProd && (!refreshSecret || refreshSecret === 'dev_refresh_secret_change_in_production')) {
    throw new Error('CRITICAL SECURITY ALERT: JWT_REFRESH_SECRET environment variable must be explicitly defined in production!');
  }

  return {
    secret: secret ?? 'dev_secret_change_in_production',
    refreshSecret: refreshSecret ?? 'dev_refresh_secret_change_in_production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  };
});

export const cashfreeConfig = registerAs('cashfree', () => ({
  appId: process.env.CASHFREE_APP_ID ?? '',
  secretKey: process.env.CASHFREE_SECRET_KEY ?? '',
  env: (process.env.CASHFREE_ENV ?? 'TEST') as 'TEST' | 'PRODUCTION',
}));

export const whatsappConfig = registerAs('whatsapp', () => ({
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? '',
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? '',
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? '',
}));
