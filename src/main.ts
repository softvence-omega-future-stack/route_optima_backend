import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);

  console.log('====================================');
  console.log(`🚀 Server is running on 3000`);
  console.log('====================================');
}
bootstrap();
