import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class PushProvider {
  private readonly logger = new Logger(PushProvider.name);
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');

    if (projectId && privateKey && clientEmail && projectId !== 'your-project-id') {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey: privateKey.replace(/\\n/g, '\n'),
            clientEmail,
          }),
        });
        this.isConfigured = true;
        this.logger.log('Firebase push provider configured');
      } catch (error) {
        this.isConfigured = false;
        this.logger.warn('Firebase initialization failed. Push notifications will be mocked.');
      }
    } else {
      this.isConfigured = false;
      this.logger.warn('Firebase credentials not configured. Push notifications will be mocked.');
    }
  }

  async send(deviceToken: string, title: string, body: string, data?: Record<string, any>): Promise<{ messageId: string; status: string }> {
    if (!this.isConfigured) {
      this.logger.warn(`[MOCK] Push notification would be sent to ${deviceToken}: ${title}`);
      return {
        messageId: `mock-${Date.now()}`,
        status: 'mocked',
      };
    }

    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token: deviceToken,
      };

      const messageId = await admin.messaging().send(message);

      this.logger.log(`Push notification sent to ${deviceToken}`);

      return {
        messageId,
        status: 'sent',
      };
    } catch (error) {
      this.logger.error(`Failed to send push notification to ${deviceToken}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async sendToTopic(topic: string, title: string, body: string, data?: Record<string, any>): Promise<{ messageId: string; status: string }> {
    if (!this.isConfigured) {
      this.logger.warn(`[MOCK] Push notification would be sent to topic ${topic}: ${title}`);
      return {
        messageId: `mock-${Date.now()}`,
        status: 'mocked',
      };
    }

    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        topic,
      };

      const messageId = await admin.messaging().send(message);

      this.logger.log(`Push notification sent to topic ${topic}`);

      return {
        messageId,
        status: 'sent',
      };
    } catch (error) {
      this.logger.error(`Failed to send push notification to topic ${topic}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
