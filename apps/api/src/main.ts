import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const globalPrefix = configService.get<string>('GLOBAL_PREFIX', '/api/v1');
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:4200');

  app.useLogger(app.get(PinoLogger));
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: [corsOrigin, 'http://localhost:4200', 'http://localhost:5173', 'http://127.0.0.1:4200'],
    credentials: true,
  });

  const cleanPrefix = globalPrefix.startsWith('/') ? globalPrefix.substring(1) : globalPrefix;
  app.setGlobalPrefix(cleanPrefix);
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(port);
  Logger.log(`🚀 API Application running on: http://localhost:${port}/${cleanPrefix}`);
}

bootstrap();
