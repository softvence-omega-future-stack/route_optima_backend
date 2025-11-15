import { Injectable, Logger } from '@nestjs/common';
import { sendResponse } from 'src/lib/responseHandler';
import { HttpStatus } from '@nestjs/common';

interface CredentialsResponse {
  GEO_CODING_API_KEY: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_PHONE_NUMBER: string;
}

@Injectable()
export class CredentialsService {
  private readonly logger = new Logger(CredentialsService.name);

  async getCredentials() {
    try {
      this.logger.log('Fetching credentials from environment variables...');

      // Get credentials from environment variables
      const geoApiKey = process.env.GEO_CODING_API_KEY;
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

      // Check if all required credentials exist
      const missingCredentials: string[] = [];

      if (!geoApiKey) missingCredentials.push('GEO_CODING_API_KEY');
      if (!twilioSid) missingCredentials.push('TWILIO_ACCOUNT_SID');
      if (!twilioPhone) missingCredentials.push('TWILIO_PHONE_NUMBER');

      if (missingCredentials.length > 0) {
        this.logger.warn(`Missing credentials: ${missingCredentials.join(', ')}`);
        
        return sendResponse(
          HttpStatus.NOT_FOUND,
          false,
          'Some credentials are not configured',
          {
            missingCredentials,
            message: 'Please check your environment variables configuration'
          }
        );
      }

      // Prepare response data (mask sensitive information for security)
      const credentials: CredentialsResponse = {
        GEO_CODING_API_KEY: this.maskApiKey(geoApiKey!),
        TWILIO_ACCOUNT_SID: this.maskSid(twilioSid!),
        TWILIO_PHONE_NUMBER: twilioPhone as string, 
      };

      this.logger.log('Credentials retrieved successfully');

      return sendResponse(
        HttpStatus.OK,
        true,
        'Credentials retrieved successfully',
        credentials
      );

    } catch (error) {
      this.logger.error('Error fetching credentials:', error);
      
      return sendResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        'Failed to retrieve credentials',
        {
          error: error.message,
          suggestion: 'Please check server configuration'
        }
      );
    }
  }

  /**
   * Mask API key for security (show first 4 and last 4 characters)
   */
  private maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length <= 8) {
      return '••••••••';
    }
    const firstPart = apiKey.substring(0, 4);
    const lastPart = apiKey.substring(apiKey.length - 4);
    return `${firstPart}••••${lastPart}`;
  }

  /**
   * Mask Twilio Account SID for security
   */
  private maskSid(sid: string): string {
    if (!sid || sid.length <= 8) {
      return '••••••••';
    }
    const firstPart = sid.substring(0, 3);
    const lastPart = sid.substring(sid.length - 3);
    return `${firstPart}••••${lastPart}`;
  }

  /**
   * Optional: Method to check if credentials are properly configured
   */
  async checkCredentialsStatus() {
    try {
      const geoApiKey = process.env.GEO_CODING_API_KEY;
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

      const status = {
        GEO_CODING_API_KEY: {
          configured: !!geoApiKey,
          length: geoApiKey ? geoApiKey.length : 0
        },
        TWILIO_ACCOUNT_SID: {
          configured: !!twilioSid,
          length: twilioSid ? twilioSid.length : 0
        },
        TWILIO_PHONE_NUMBER: {
          configured: !!twilioPhone,
          value: twilioPhone || 'Not set'
        },
        allConfigured: !!(geoApiKey && twilioSid && twilioPhone)
      };

      return sendResponse(
        HttpStatus.OK,
        true,
        'Credentials status checked successfully',
        status
      );

    } catch (error) {
      this.logger.error('Error checking credentials status:', error);
      
      return sendResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        false,
        'Failed to check credentials status',
        error.message
      );
    }
  }
}