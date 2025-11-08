import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { DEFAULT_TIME_SLOTS } from './database/seeds/default-time-slots.seed';

// Load .env only in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();

}

async function seedDefaultTimeSlots(prisma: PrismaService) {
  try {
    const existingSlots = await prisma.defaultTimeSlot.count();

    if (existingSlots === 0) {
      console.log('📅 Creating default time slots...');
      
      await prisma.defaultTimeSlot.createMany({
        data: DEFAULT_TIME_SLOTS,
      });
      
      console.log('✅ Default time slots created successfully!');
    } else {
      console.log('ℹ️  Default time slots already exist');
    }
  } catch (error) {
    console.error('❌ Error seeding default time slots:', error);
    throw error;
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
  });

  // Get PrismaService from the app context
  const prismaService = app.get(PrismaService);

  // Seed default time slots
  await seedDefaultTimeSlots(prismaService);

  // Serve static files from /uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Middleware
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe - CRITICAL for DTO validation and transformation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  // Use the PORT from .env or fallback to 3000
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Server is running on port ${port}`);
}

bootstrap();

