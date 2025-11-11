import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class NotificationPreferencesSeeder implements OnModuleInit {
  private readonly logger = new Logger(NotificationPreferencesSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedNotificationPreferences();
  }

  private async seedNotificationPreferences() {
    try {
      const existing = await this.prisma.notificationPreferences.findUnique({
        where: { id: 'singleton' },
      });

      if (!existing) {
        this.logger.log('🔔 Creating default notification preferences...');

        await this.prisma.notificationPreferences.create({
          data: {
            id: 'singleton',
            sendCustomerEmail: true,
            sendTechnicianSMS: true, 
          },
        });

        this.logger.log('✅ Notification preferences seeded successfully!');
      } else {
        this.logger.log('ℹ️ Notification preferences already exist');
      }
    } catch (error) {
      this.logger.error('❌ Error seeding notification preferences:', error);
    }
  }
}
