import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug'],
  });

  const logger = new Logger('Bootstrap');

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : true,
    credentials: true,
  });

  // Global validation pipe — auto-validates all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // strip unknown fields
      forbidNonWhitelisted: true,
      transform: true,          // auto-cast to DTO types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix (exclude root / and /health for direct health checks)
  app.setGlobalPrefix('api/v1', { exclude: ['/', 'health'] });

  // Swagger docs
  const config = new DocumentBuilder()
    .setTitle('Billing SaaS REST API')
    .setDescription('Multi-tenant grocery billing, POS & inventory management API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  logger.log('Swagger docs available at /api/docs');

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  logger.log(`🚀 API running on http://localhost:${port}/api/v1`);
}

bootstrap();
