import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './core/config/config.module';
import { DatabaseModule } from './core/database/database.module';
import { AuthModule } from './core/auth/auth.module';
import { TenantModule } from './core/tenant/tenant.module';
import { TenantMiddleware } from './core/tenant/tenant.middleware';
import { QueueModule } from './infra/queue/queue.module';
import { UsersModule } from './modules/users/users.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { RedisModule } from './infra/redis/redis.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { EventsModule } from './modules/events/events.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RedisModule,
    QueueModule,
    EventEmitterModule.forRoot(),
    AuthModule,
    TenantModule,
    UsersModule,
    SessionsModule,
    RealtimeModule,
    EventsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
