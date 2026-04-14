import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);
  private readonly client: Twilio;
  private readonly isConfigured: boolean;
  private readonly fromNumber: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER') || '+1234567890'; // Default from number for testing

    if (accountSid && authToken && accountSid !== 'ACyour-sid' && authToken !== 'your-token') {
      this.client = new Twilio(accountSid, authToken);
      this.isConfigured = true;
      this.logger.log('Twilio SMS provider configured');
    } else {
      this.isConfigured = false;
      this.logger.warn('Twilio credentials not configured. SMS sending will be mocked.');
    }
  }

  async send(to: string, body: string): Promise<{ sid: string; status: string }> {
    if (!this.isConfigured) {
      this.logger.warn(`[MOCK] SMS would be sent to ${to}: ${body}`);
      return {
        sid: `mock-${Date.now()}`,
        status: 'mocked',
      };
    }

    try {
      const message = await this.client.messages.create({
        body,
        from: this.fromNumber,
        to,
      });

      this.logger.log(`SMS sent to ${to}`);

      return {
        sid: message.sid,
        status: message.status,
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
