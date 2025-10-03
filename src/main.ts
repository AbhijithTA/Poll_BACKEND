import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

async function bootstrap() {
  // Set memory optimization for production
  if (process.env.NODE_ENV === 'production') {
    process.env.NODE_OPTIONS = '--max-old-space-size=256';
  }

  const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    Logger.error(`Missing required environment variables: ${missingVars.join(', ')}`, 'Bootstrap');
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production' ? ['error', 'warn', 'log'] : ['log', 'debug', 'error', 'verbose', 'warn'],
  });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    disableErrorMessages: false,
    validationError: {
      target: false,
      value: false,
    },
  }));
  
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Starting the server only after the database connection is established
  await app.init();
  const connection: Connection = app.get(getConnectionToken());

  if (connection.readyState !== 1) {
    await new Promise<void>((resolve, reject) => {
      const onConnected = () => {
        connection.off('error', onError);
        resolve();
      };
      const onError = (err: unknown) => {
        connection.off('connected', onConnected);
        reject(err);
      };

      connection.once('connected', onConnected);
      connection.once('error', onError);
    });
  }

  Logger.log('Database connected', 'Bootstrap');


  // Add graceful shutdown handling
  process.on('SIGTERM', async () => {
    Logger.log('SIGTERM received, shutting down gracefully', 'Bootstrap');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    Logger.log('SIGINT received, shutting down gracefully', 'Bootstrap');
    await app.close();
    process.exit(0);
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  Logger.log(`Server started on port ${port}`, 'Bootstrap');
}
bootstrap();