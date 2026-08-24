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
  const secret = process.env.JWT_SECRET || 'billing_saas_jwt_super_secret_key_prod_2026';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET ? `${process.env.JWT_SECRET}_refresh_secret_2026` : 'billing_saas_jwt_refresh_super_secret_key_prod_2026');

  return {
    secret,
    refreshSecret,
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
