import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { google, calendar_v3 } from 'googleapis';
import { CalendarEvent, CalendarType } from '../entities/calendar-event.entity';
import { LeaveRequest } from '../../leaves/entities/leave-request.entity';
import { GoogleOAuthService } from './google-oauth.service';
import { LeaveType } from '../../common/enums/leave-type.enum';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    @InjectRepository(CalendarEvent)
    private calendarEventRepository: Repository<CalendarEvent>,
    @InjectRepository(LeaveRequest)
    private leaveRequestRepository: Repository<LeaveRequest>,
    private googleOAuthService: GoogleOAuthService,
  ) {}

  /**
   * Create calendar event for a leave request
   */
  async createLeaveEvent(
    leaveRequest: LeaveRequest,
    calendarType: CalendarType,
  ): Promise<CalendarEvent | null> {
    try {
      let calendarId: string;
      let calendar: calendar_v3.Calendar;

      if (calendarType === CalendarType.PERSONAL) {
        // Get OAuth client for personal calendar
        const auth = await this.googleOAuthService.getOAuth2Client(
          leaveRequest.employeeId,
        );
        calendar = google.calendar({ version: 'v3', auth });
        calendarId = 'primary';
      } else {
        // Shared calendar (to be implemented)
        this.logger.log('Shared calendar not yet implemented');
        return null;
      }

      // Prepare event details
      const event = this.buildCalendarEvent(leaveRequest);

      // Create event in Google Calendar
      const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
      });

      if (!response.data.id) {
        throw new Error('Failed to create calendar event');
      }

      // Save event reference in database
      const calendarEvent = this.calendarEventRepository.create({
        leaveRequestId: leaveRequest.id,
        googleEventId: response.data.id,
        calendarId,
        calendarType,
        employeeId: leaveRequest.employeeId,
        syncStatus: 'synced',
      });

      await this.calendarEventRepository.save(calendarEvent);

      // Update sync status
      await this.googleOAuthService.updateSyncStatus(
        leaveRequest.employeeId,
        true,
      );

      this.logger.log(
        `Created calendar event ${response.data.id} for leave request ${leaveRequest.id}`,
      );

      return calendarEvent;
    } catch (error) {
      this.logger.error(`Failed to create calendar event: ${error.message}`, error.stack);

      // Update sync status with error
      await this.googleOAuthService.updateSyncStatus(
        leaveRequest.employeeId,
        false,
        error.message,
      );

      return null;
    }
  }

  /**
   * Update calendar event for a leave request
   */
  async updateLeaveEvent(leaveRequest: LeaveRequest): Promise<void> {
    try {
      // Find all calendar events for this leave request
      const calendarEvents = await this.calendarEventRepository.find({
        where: { leaveRequestId: leaveRequest.id },
      });

      for (const calendarEvent of calendarEvents) {
        if (calendarEvent.calendarType === CalendarType.PERSONAL) {
          const auth = await this.googleOAuthService.getOAuth2Client(
            leaveRequest.employeeId,
          );
          const calendar = google.calendar({ version: 'v3', auth });

          const event = this.buildCalendarEvent(leaveRequest);

          await calendar.events.update({
            calendarId: calendarEvent.calendarId,
            eventId: calendarEvent.googleEventId,
            requestBody: event,
          });

          calendarEvent.syncStatus = 'synced';
          calendarEvent.syncError = null;
          await this.calendarEventRepository.save(calendarEvent);

          this.logger.log(
            `Updated calendar event ${calendarEvent.googleEventId} for leave request ${leaveRequest.id}`,
          );
        }
      }

      await this.googleOAuthService.updateSyncStatus(
        leaveRequest.employeeId,
        true,
      );
    } catch (error) {
      this.logger.error(`Failed to update calendar event: ${error.message}`, error.stack);

      await this.googleOAuthService.updateSyncStatus(
        leaveRequest.employeeId,
        false,
        error.message,
      );
    }
  }

  /**
   * Delete calendar event for a leave request
   */
  async deleteLeaveEvent(leaveRequestId: string): Promise<void> {
    try {
      // Find all calendar events for this leave request
      const calendarEvents = await this.calendarEventRepository.find({
        where: { leaveRequestId },
      });

      for (const calendarEvent of calendarEvents) {
        try {
          if (calendarEvent.calendarType === CalendarType.PERSONAL) {
            const auth = await this.googleOAuthService.getOAuth2Client(
              calendarEvent.employeeId,
            );
            const calendar = google.calendar({ version: 'v3', auth });

            await calendar.events.delete({
              calendarId: calendarEvent.calendarId,
              eventId: calendarEvent.googleEventId,
            });

            this.logger.log(
              `Deleted calendar event ${calendarEvent.googleEventId} for leave request ${leaveRequestId}`,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Failed to delete Google Calendar event ${calendarEvent.googleEventId}: ${error.message}`,
          );
          // Continue with database deletion even if Google API fails
        }

        // Remove from database
        await this.calendarEventRepository.remove(calendarEvent);
      }
    } catch (error) {
      this.logger.error(`Failed to delete calendar events: ${error.message}`, error.stack);
    }
  }

  /**
   * Build Google Calendar event object from leave request
   */
  private buildCalendarEvent(
    leaveRequest: LeaveRequest,
  ): calendar_v3.Schema$Event {
    const leaveTypeLabel = this.getLeaveTypeLabel(leaveRequest.leaveType);
    const summary = `On Leave - ${leaveTypeLabel}`;

    let description = `Leave Type: ${leaveTypeLabel}\n`;
    description += `Duration: ${leaveRequest.daysCount} day(s)\n`;
    if (leaveRequest.reason) {
      description += `Reason: ${leaveRequest.reason}\n`;
    }
    description += `\nStatus: ${leaveRequest.status}`;

    const startDate = new Date(leaveRequest.startDate);
    const endDate = new Date(leaveRequest.endDate);

    const event: calendar_v3.Schema$Event = {
      summary,
      description,
      colorId: '11', // Red color for leaves
      transparency: 'transparent', // Show as free or busy
    };

    // Check if it's a half-day leave
    if (leaveRequest.isHalfDay) {
      // Half-day event: 9 AM to 1 PM
      const startDateTime = new Date(startDate);
      startDateTime.setHours(9, 0, 0, 0);

      const endDateTime = new Date(startDate);
      endDateTime.setHours(13, 0, 0, 0);

      event.start = {
        dateTime: startDateTime.toISOString(),
        timeZone: 'UTC',
      };
      event.end = {
        dateTime: endDateTime.toISOString(),
        timeZone: 'UTC',
      };
    } else {
      // Full-day event
      event.start = {
        date: this.formatDate(startDate),
      };

      // For all-day events, end date should be the day after
      const eventEndDate = new Date(endDate);
      eventEndDate.setDate(eventEndDate.getDate() + 1);

      event.end = {
        date: this.formatDate(eventEndDate),
      };
    }

    return event;
  }

  /**
   * Get human-readable leave type label
   */
  private getLeaveTypeLabel(leaveType: LeaveType): string {
    const labels = {
      [LeaveType.EARNED]: 'Earned Leave',
      [LeaveType.SICK]: 'Sick Leave',
      [LeaveType.CASUAL]: 'Casual Leave',
    };
    return labels[leaveType] || leaveType;
  }

  /**
   * Format date as YYYY-MM-DD for all-day events
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get all calendar events for an employee
   */
  async getEmployeeCalendarEvents(employeeId: string): Promise<CalendarEvent[]> {
    return await this.calendarEventRepository.find({
      where: { employeeId },
      relations: ['leaveRequest'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Check if leave has synced calendar events
   */
  async hasCalendarEvents(leaveRequestId: string): Promise<boolean> {
    const count = await this.calendarEventRepository.count({
      where: { leaveRequestId },
    });
    return count > 0;
  }
}
