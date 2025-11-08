import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";

export const DEFAULT_TIME_SLOTS = [
  { label: '8:00 AM - 10:00 AM', startTime: '08:00', endTime: '10:00', order: 1 },
  { label: '10:00 AM - 12:00 PM', startTime: '10:00', endTime: '12:00', order: 2 },
  { label: '11:00 AM - 1:00 PM', startTime: '11:00', endTime: '13:00', order: 3 },
  { label: '1:00 PM - 3:00 PM', startTime: '13:00', endTime: '15:00', order: 4 },
  { label: '2:00 PM - 4:00 PM', startTime: '14:00', endTime: '16:00', order: 5 },
  { label: '4:00 PM - 6:00 PM', startTime: '16:00', endTime: '18:00', order: 6 },
];

@Injectable()
export class DefaultTimeSlotSeeder implements OnModuleInit {
  private readonly logger = new Logger(DefaultTimeSlotSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultTimeSlots();
  }

  async seedDefaultTimeSlots() {
    try {
      const existingSlots = await this.prisma.defaultTimeSlot.count();

      if (existingSlots === 0) {
        this.logger.log('📅 Creating default time slots...');
        
        await this.prisma.defaultTimeSlot.createMany({
          data: DEFAULT_TIME_SLOTS,
        });
        
        this.logger.log('✅ Default time slots created successfully!');
      } else {
        this.logger.log('ℹ️  Default time slots already exist');
      }
    } catch (error) {
      this.logger.error('❌ Error seeding default time slots:', error);
      // Don't throw error to prevent app from crashing
    }
  }
}