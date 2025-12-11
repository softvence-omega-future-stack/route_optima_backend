import { 
  Controller, 
  Get, 
  Patch, 
  Body, 
  HttpCode, 
  HttpStatus,
  ConflictException,
  UseGuards 
} from '@nestjs/common';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdateSmsPreferenceDto } from './dto/update-sms-preference.dto';
import { UpdateEmailPreferenceDto } from './dto/update-email-preference.dto';
import { AuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/role-guard';
import { AuthRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('api/v1/notification-preferences')
export class NotificationPreferencesController {
  constructor(
    private readonly notificationPreferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.ADMIN, UserRole.DISPATCHER)
  @HttpCode(HttpStatus.OK)
  async getPreferences() {
    const preferences = await this.notificationPreferencesService.getPreferences();
    return {
      success: true,
      message: 'Notification preferences retrieved successfully',
      data: preferences,
    };
  }

  @Patch('sms')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.DISPATCHER)
  @HttpCode(HttpStatus.OK)
  async updateSmsPreference(@Body() updateDto: UpdateSmsPreferenceDto) {
    try {
      const preferences = await this.notificationPreferencesService.updateSmsPreference(
        updateDto.sendTechnicianSMS,
      );
      return {
        success: true,
        message: 'SMS notification preference updated successfully',
        data: preferences,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
      throw error;
    }
  }

  @Patch('email')
  @UseGuards(AuthGuard, RolesGuard)
  @AuthRoles(UserRole.DISPATCHER)
  @HttpCode(HttpStatus.OK)
  async updateEmailPreference(@Body() updateDto: UpdateEmailPreferenceDto) {
    try {
      const preferences = await this.notificationPreferencesService.updateEmailPreference(
        updateDto.sendCustomerEmail,
      );
      return {
        success: true,
        message: 'Email notification preference updated successfully',
        data: preferences,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
      throw error;
    }
  }
}