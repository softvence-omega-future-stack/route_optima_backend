import { Module } from '@nestjs/common';
import { DefaultTimeSlotService } from './default-time-slot.service';
import { DefaultTimeSlotController } from './default-time-slot.controller';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DefaultTimeSlotController],
  providers: [DefaultTimeSlotService],
    exports: [DefaultTimeSlotService],
})
export class DefaultTimeSlotModule {}
