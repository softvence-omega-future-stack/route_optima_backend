import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  imports: [JwtModule],
  controllers: [NotificationPreferencesController],
  providers: [NotificationPreferencesService, PrismaService],
  exports: [NotificationPreferencesService],
})
export class NotificationPreferencesModule {}