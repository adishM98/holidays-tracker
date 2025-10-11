import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { LeaveRequest } from '../../leaves/entities/leave-request.entity';
import { LeaveStatus } from '../../common/enums/leave-status.enum';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleCalendarToken } from '../entities/google-calendar-token.entity';
import { CalendarType } from '../entities/calendar-event.entity';
import { SettingsService } from '../../settings/settings.service';
import { SyncMode } from '../dto/calendar-settings.dto';

@Injectable()
export class CalendarSyncService {
  private readonly logger = new Logger(CalendarSyncService.name);
  private readonly isEnabled: boolean;

  constructor(
    @InjectRepository(LeaveRequest)
    private leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(GoogleCalendarToken)
    private tokenRepository: Repository<GoogleCalendarToken>,
    private googleCalendarService: GoogleCalendarService,
    private settingsService: SettingsService,
    private configService: ConfigService,
  ) {
    // Check if Google Calendar feature is enabled
    this.isEnabled = this.configService.get<string>('GOOGLE_CALENDAR_ENABLED') === 'true';

    if (!this.isEnabled) {
      this.logger.log('Google Calendar integration is disabled');
    }
  }

  /**
   * Check if Google Calendar integration is enabled
   */
  private checkEnabled(): boolean {
    if (!this.isEnabled) {
      this.logger.debug('Skipping calendar operation - Google Calendar integration is disabled');
      return false;
    }
    return true;
  }

  /**
   * Sync leave request to calendar (called after leave creation/approval)
   */
  async syncLeaveToCalendar(leaveRequest: LeaveRequest): Promise<void> {
    // Check if Google Calendar is enabled
    if (!this.checkEnabled()) {
      return;
    }

    try {
      // Only sync approved leaves
      if (leaveRequest.status !== LeaveStatus.APPROVED) {
        this.logger.log(
          `Skipping calendar sync for leave ${leaveRequest.id} - status is ${leaveRequest.status}`,
        );
        return;
      }

      // Get sync mode from settings
      let syncMode = SyncMode.PERSONAL_ONLY;
      try {
        const setting = await this.settingsService.getSetting('calendar_sync_mode');
        syncMode = (setting.value as SyncMode) || SyncMode.PERSONAL_ONLY;
      } catch (error) {
        // Default to personal only if setting doesn't exist
      }

      // Check if employee has connected their personal calendar
      const hasPersonalConnection = await this.tokenRepository.findOne({
        where: { employeeId: leaveRequest.employeeId, isActive: true },
      });

      // Sync to personal calendar
      if (
        hasPersonalConnection &&
        (syncMode === SyncMode.PERSONAL_ONLY || syncMode === SyncMode.BOTH)
      ) {
        await this.googleCalendarService.createLeaveEvent(
          leaveRequest,
          CalendarType.PERSONAL,
        );
        this.logger.log(
          `Synced leave ${leaveRequest.id} to personal calendar for employee ${leaveRequest.employeeId}`,
        );
      }

      // Sync to shared calendar
      if (syncMode === SyncMode.SHARED_ONLY || syncMode === SyncMode.BOTH) {
        try {
          const setting = await this.settingsService.getSetting('enable_shared_calendar');
          const sharedCalendarEnabled = setting.value === 'true';

          if (sharedCalendarEnabled) {
            // TODO: Implement shared calendar sync
            this.logger.log(
              `Shared calendar sync for leave ${leaveRequest.id} - to be implemented`,
            );
          }
        } catch (error) {
          // Setting doesn't exist, skip shared calendar
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to sync leave ${leaveRequest.id} to calendar: ${error.message}`,
        error.stack,
      );
      // Don't throw - calendar sync failures shouldn't block leave operations
    }
  }

  /**
   * Update calendar event when leave is modified
   */
  async updateLeaveInCalendar(leaveRequest: LeaveRequest): Promise<void> {
    // Check if Google Calendar is enabled
    if (!this.checkEnabled()) {
      return;
    }

    try {
      // Only update approved leaves that have calendar events
      if (leaveRequest.status !== LeaveStatus.APPROVED) {
        this.logger.log(
          `Skipping calendar update for leave ${leaveRequest.id} - not approved`,
        );
        return;
      }

      const hasEvents = await this.googleCalendarService.hasCalendarEvents(
        leaveRequest.id,
      );

      if (!hasEvents) {
        // If no events exist, create them
        await this.syncLeaveToCalendar(leaveRequest);
        return;
      }

      // Update existing events
      await this.googleCalendarService.updateLeaveEvent(leaveRequest);

      this.logger.log(
        `Updated calendar events for leave ${leaveRequest.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update leave ${leaveRequest.id} in calendar: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Remove calendar event when leave is cancelled/rejected/deleted
   */
  async removeLeaveFromCalendar(leaveRequestId: string): Promise<void> {
    // Check if Google Calendar is enabled
    if (!this.checkEnabled()) {
      return;
    }

    try {
      await this.googleCalendarService.deleteLeaveEvent(leaveRequestId);

      this.logger.log(
        `Removed calendar events for leave ${leaveRequestId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove leave ${leaveRequestId} from calendar: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Batch sync leaves for an employee (useful for initial setup)
   */
  async batchSyncEmployeeLeaves(employeeId: string): Promise<void> {
    // Check if Google Calendar is enabled
    if (!this.checkEnabled()) {
      return;
    }

    try {
      // Get all approved leaves for the employee
      const approvedLeaves = await this.leaveRequestRepository.find({
        where: {
          employeeId,
          status: LeaveStatus.APPROVED,
        },
      });

      this.logger.log(
        `Starting batch sync of ${approvedLeaves.length} leaves for employee ${employeeId}`,
      );

      for (const leave of approvedLeaves) {
        // Check if event already exists
        const hasEvent = await this.googleCalendarService.hasCalendarEvents(
          leave.id,
        );

        if (!hasEvent) {
          await this.syncLeaveToCalendar(leave);
        }
      }

      this.logger.log(
        `Completed batch sync for employee ${employeeId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed batch sync for employee ${employeeId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
