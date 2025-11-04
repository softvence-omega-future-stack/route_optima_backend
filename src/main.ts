import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

// Load .env only in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
  });

  // Serve static files from /uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Middleware
  app.use(cookieParser());

  // Enable CORS with environment-based configuration
  app.enableCors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Use the PORT from .env or fallback to 3000
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Server is running on port ${port}`);
}
bootstrap();

