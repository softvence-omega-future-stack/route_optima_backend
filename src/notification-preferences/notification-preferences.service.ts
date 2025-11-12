import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(private prisma: PrismaService) {}

  async getPreferences() {
    try {
      let preferences = await this.prisma.notificationPreferences.findUnique({
        where: { id: 'singleton' },
      });

      // Create default preferences if they don't exist
      if (!preferences) {
        preferences = await this.prisma.notificationPreferences.create({
          data: {
            id: 'singleton',
            sendCustomerEmail: true,
            sendTechnicianSMS: true,
          },
        });
      }

      return preferences;
    } catch (error) {
      this.logger.error('Error getting notification preferences:', error);
      throw error;
    }
  }

  async updateSmsPreference(sendTechnicianSMS: boolean) {
    try {
      // Get current preferences first
      const currentPreferences = await this.getPreferences();

      // Check if the status is already the same
      if (currentPreferences.sendTechnicianSMS === sendTechnicianSMS) {
        throw new ConflictException(
          `SMS notifications are already ${sendTechnicianSMS ? 'enabled' : 'disabled'}`,
        );
      }

      const preferences = await this.prisma.notificationPreferences.upsert({
        where: { id: 'singleton' },
        update: { sendTechnicianSMS },
        create: {
          id: 'singleton',
          sendTechnicianSMS,
          sendCustomerEmail: true, // default for email
        },
      });

      this.logger.log(`SMS preference updated to: ${sendTechnicianSMS}`);
      return preferences;
    } catch (error) {
      // Re-throw the conflict exception
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Error updating SMS preference:', error);
      throw error;
    }
  }

  async updateEmailPreference(sendCustomerEmail: boolean) {
    try {
      // Get current preferences first
      const currentPreferences = await this.getPreferences();

      // Check if the status is already the same
      if (currentPreferences.sendCustomerEmail === sendCustomerEmail) {
        throw new ConflictException(
          `Email notifications are already ${sendCustomerEmail ? 'enabled' : 'disabled'}`,
        );
      }

      const preferences = await this.prisma.notificationPreferences.upsert({
        where: { id: 'singleton' },
        update: { sendCustomerEmail },
        create: {
          id: 'singleton',
          sendCustomerEmail,
          sendTechnicianSMS: true, // default for SMS
        },
      });

      this.logger.log(`Email preference updated to: ${sendCustomerEmail}`);
      return preferences;
    } catch (error) {
      // Re-throw the conflict exception
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Error updating email preference:', error);
      throw error;
    }
  }
}