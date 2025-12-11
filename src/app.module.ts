import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { JobsModule } from './jobs/jobs.module';
import { TechnicianModule } from './technician/technician.module';
import { DefaultTimeSlotModule } from './default-time-slot/default-time-slot.module';
import { NotificationPreferencesModule } from './notification-preferences/notification-preferences.module';
import { CredentialsModule } from './credentials/credentials.module';
import { DispatcherModule } from './dispatcher/dispatcher.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    JobsModule,
    TechnicianModule,
    DefaultTimeSlotModule,
    NotificationPreferencesModule,
    CredentialsModule,
    DispatcherModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
