import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class TwilioUtil {
  private client;
  private readonly logger = new Logger(TwilioUtil.name);

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.client = twilio(accountSid, authToken);
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; message: string }> {
    try {
      const from = this.configService.get<string>('TWILIO_PHONE_NUMBER');

      await this.client.messages.create({ body: message, from, to });

      this.logger.log(`✅ SMS sent successfully to ${to}`);

      return {
        success: true,
        message: `SMS sent to ${to}`,
      };
    } catch (error) {
      const msg = `SMS not sent to ${to}. Reason: ${error?.message ?? 'Unknown error'}`;
      this.logger.warn(`⚠️ ${msg}`);

      return {
        success: false,
        message: msg,
      };
    }
  }
}