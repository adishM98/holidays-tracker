import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  UseGuards,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GoogleOAuthService } from './services/google-oauth.service';
import { GoogleCalendarService } from './services/google-calendar.service';

@Controller('google-calendar')
@UseGuards(JwtAuthGuard)
export class GoogleCalendarController {
  constructor(
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  /**
   * Get authorization URL to initiate OAuth flow
   */
  @Get('auth/url')
  getAuthUrl(@Req() req: any) {
    const employeeId = req.user.employee?.id;

    if (!employeeId) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Employee profile not found',
      };
    }

    const authUrl = this.googleOAuthService.getAuthorizationUrl(employeeId);

    return {
      statusCode: HttpStatus.OK,
      data: { authUrl },
    };
  }

  /**
   * Handle OAuth callback
   */
  @Get('auth/callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      if (!code || !state) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/settings?calendar_error=missing_params`,
        );
      }

      const employeeId = state; // State contains employee ID

      await this.googleOAuthService.handleOAuthCallback(code, employeeId);

      // Redirect to frontend with success message
      return res.redirect(
        `${process.env.FRONTEND_URL}/settings?calendar_connected=true`,
      );
    } catch (error) {
      console.error('OAuth callback error:', error);
      return res.redirect(
        `${process.env.FRONTEND_URL}/settings?calendar_error=auth_failed`,
      );
    }
  }

  /**
   * Get connection status
   */
  @Get('status')
  async getStatus(@Req() req: any) {
    const employeeId = req.user.employee?.id;

    if (!employeeId) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Employee profile not found',
      };
    }

    const status = await this.googleOAuthService.getConnectionStatus(employeeId);

    return {
      statusCode: HttpStatus.OK,
      data: status,
    };
  }

  /**
   * Disconnect Google Calendar
   */
  @Delete('disconnect')
  async disconnect(@Req() req: any) {
    const employeeId = req.user.employee?.id;

    if (!employeeId) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Employee profile not found',
      };
    }

    await this.googleOAuthService.disconnectCalendar(employeeId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Google Calendar disconnected successfully',
    };
  }

  /**
   * Get calendar events for the current employee
   */
  @Get('events')
  async getEvents(@Req() req: any) {
    const employeeId = req.user.employee?.id;

    if (!employeeId) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Employee profile not found',
      };
    }

    const events = await this.googleCalendarService.getEmployeeCalendarEvents(
      employeeId,
    );

    return {
      statusCode: HttpStatus.OK,
      data: events,
    };
  }

  /**
   * Manually trigger sync for a specific leave (admin/testing purposes)
   */
  @Post('sync/:leaveRequestId')
  async syncLeaveRequest(@Req() req: any, @Query('leaveRequestId') leaveRequestId: string) {
    // This endpoint can be used for manual sync or retry failed syncs
    // Implementation depends on specific requirements
    return {
      statusCode: HttpStatus.OK,
      message: 'Sync triggered',
    };
  }
}
