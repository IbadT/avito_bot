import { Module } from '@nestjs/common';
import { TelegramModule } from './telegram/telegram.module';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as LocalSession from 'telegraf-session-local';
import { ScheduleModule } from '@nestjs/schedule';

const sessions = new LocalSession({ database: 'session_db.json' });

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TelegramModule,
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        middlewares: [sessions.middleware()],
        token: configService.get<string>("TG_BOT_TOKEN")
      }),
      inject: [ConfigService]
    }),

  ],
})
export class AppModule {}
