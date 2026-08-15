import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3001;

  let frontendUrl =
    process.env.FRONTEND_URL || 'https://qoa-frontend.vercel.app';
  frontendUrl = frontendUrl.replace(/\/$/, '');

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe());

  const allowedOrigins: Record<string, string[]> = {
    development: ['http://localhost:3000'],
    staging: ['https://staging.yourdomain.com'],
    production: [frontendUrl],
  };

  const env = process.env.NODE_ENV || 'development';
  const origins = allowedOrigins[env] || allowedOrigins.development;

  // Clean origins
  const cleanOrigins = origins.map((origin) => origin.replace(/\/$/, ''));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const cleanOrigin = origin.replace(/\/$/, '');
      const isAllowed = cleanOrigins.some(
        (allowed) => allowed.toLowerCase() === cleanOrigin.toLowerCase(),
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        console.log(`Blocked CORS request from: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Cookie',
    ],
    exposedHeaders: ['Set-Cookie', 'Authorization'],
    maxAge: 86400,
  });

  app.use(cookieParser());

  await app.listen(port, '0.0.0.0');
  console.log(
    `Application is running on: https://qoa-backend-production.up.railway.app:${port}/api/v1`,
  );
  console.log(`Environment: ${env}`);
  console.log(`Allowed origins: ${cleanOrigins.join(', ')}`);
}
bootstrap();
