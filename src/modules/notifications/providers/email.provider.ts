import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    
    if (apiKey && apiKey !== 'SG.your-key-here' && apiKey !== '') {
      sgMail.setApiKey(apiKey);
      this.isConfigured = true;
      this.logger.log('SendGrid email provider configured');
    } else {
      this.isConfigured = false;
      this.logger.warn('SendGrid API key not configured. Email sending will be mocked.');
    }
  }

  async send(to: string, subject: string, body: string, metadata?: Record<string, any>): Promise<{ messageId: string; status: string }> {
    if (!this.isConfigured) {
      this.logger.warn(`[MOCK] Email would be sent to ${to}: ${subject}`);
      return {
        messageId: `mock-${Date.now()}`,
        status: 'mocked',
      };
    }

    try {
      const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL', 'noreply@baalvion.com');
      
      const msg = {
        to,
        from: fromEmail,
        subject,
        text: body,
        html: `<p>${body}</p>`,
      };

      const [response] = await sgMail.send(msg);
      
      this.logger.log(`Email sent to ${to}: ${subject}`);
      
      return {
        messageId: response.headers['x-message-id'] || 'unknown',
        status: 'sent',
      };
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
