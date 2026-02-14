import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bodyParser from 'body-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable built-in body parser to use custom one
  });
  const configService = app.get(ConfigService);

  // Security headers
  app.use(helmet());

  // Custom body parser that preserves rawBody for HMAC verification
  app.use(
    bodyParser.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString();
      },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  const corsOrigin = configService.get('app.corsOrigin');
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  const port = configService.get('app.port') || 3001;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();
