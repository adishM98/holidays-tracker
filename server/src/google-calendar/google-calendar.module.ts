import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { GoogleCalendarToken } from './entities/google-calendar-token.entity';
import { CalendarEvent } from './entities/calendar-event.entity';
import { LeaveRequest } from '../leaves/entities/leave-request.entity';
import { Employee } from '../employees/entities/employee.entity';
import { GoogleOAuthService } from './services/google-oauth.service';
import { GoogleCalendarService } from './services/google-calendar.service';
import { CalendarSyncService } from './services/calendar-sync.service';
import { GoogleCalendarController } from './google-calendar.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GoogleCalendarToken,
      CalendarEvent,
      LeaveRequest,
      Employee,
    ]),
    ConfigModule,
    SettingsModule,
  ],
  controllers: [GoogleCalendarController],
  providers: [
    GoogleOAuthService,
    GoogleCalendarService,
    CalendarSyncService,
  ],
  exports: [
    GoogleOAuthService,
    GoogleCalendarService,
    CalendarSyncService,
  ],
})
export class GoogleCalendarModule {}
