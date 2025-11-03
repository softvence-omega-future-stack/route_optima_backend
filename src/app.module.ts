import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { JobsService } from './jobs/jobs.service';
import { JobsController } from './jobs/jobs.controller';
import { JobsModule } from './jobs/jobs.module';
import { TechnicianService } from './technician/technician.service';
import { TechnicianController } from './technician/technician.controller';
import { TechnicianModule } from './technician/technician.module';

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
  ],
  controllers: [AppController, JobsController, TechnicianController],
  providers: [AppService, JobsService, TechnicianService],
})
export class AppModule {}
