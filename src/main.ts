// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import cookieParser from 'cookie-parser';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule, {
//     logger: false,
//   });

//   //middleware
//   app.use(cookieParser());
//   app.enableCors({
//     origin: 'http://localhost:3000',
//     credentials: true,
//   });

//   await app.listen(process.env.PORT ?? 3000);

//   console.log(`🚀 Server is running on 3000`);
// }
// bootstrap();


import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
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

