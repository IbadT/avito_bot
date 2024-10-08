import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramUpdate } from './telegram.update';
import { PrismaService } from 'src/prisma.service';
// import { ScheduleModule } from '@nestjs/schedule';

@Module({
  // imports: [ScheduleModule.forRoot()],
  providers: [
    TelegramService,
    TelegramUpdate,
    PrismaService
  ],
})
export class TelegramModule {}
