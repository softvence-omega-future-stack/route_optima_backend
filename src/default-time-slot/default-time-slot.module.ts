import { Module } from '@nestjs/common';
import { DefaultTimeSlotService } from './default-time-slot.service';
import { DefaultTimeSlotController } from './default-time-slot.controller';
import { DefaultTimeSlotSeeder } from './seed/default-time-slots.seed';
import { PrismaModule } from 'prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';


@Module({
    imports: [
    PrismaModule,
    JwtModule, 
    AuthModule, 
  ],
  controllers: [DefaultTimeSlotController],
  providers: [DefaultTimeSlotService, DefaultTimeSlotSeeder],
  exports: [DefaultTimeSlotService],
})
export class DefaultTimeSlotModule { }
