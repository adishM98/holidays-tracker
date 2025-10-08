import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { google, Auth } from 'googleapis';
import { GoogleCalendarToken } from '../entities/google-calendar-token.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Injectable()
export class GoogleOAuthService {
  private oauth2Client: Auth.OAuth2Client;
  private readonly redirectUri: string;

  constructor(
    @InjectRepository(GoogleCalendarToken)
    private tokenRepository: Repository<GoogleCalendarToken>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    private configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');

    if (!clientId || !clientSecret || !this.redirectUri) {
      console.warn('Google OAuth credentials not configured');
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      this.redirectUri,
    );
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  getAuthorizationUrl(employeeId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar',
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: employeeId, // Pass employee ID as state
      prompt: 'consent', // Force consent screen to get refresh token
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async handleOAuthCallback(
    code: string,
    employeeId: string,
  ): Promise<GoogleCalendarToken> {
    // Verify employee exists
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    try {
      // Exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new BadRequestException('Failed to obtain valid tokens');
      }

      // Calculate token expiry
      const tokenExpiry = new Date();
      if (tokens.expiry_date) {
        tokenExpiry.setTime(tokens.expiry_date);
      } else {
        // Default to 1 hour if not provided
        tokenExpiry.setHours(tokenExpiry.getHours() + 1);
      }

      // Check if token already exists for this employee
      let calendarToken = await this.tokenRepository.findOne({
        where: { employeeId },
      });

      if (calendarToken) {
        // Update existing token
        calendarToken.accessToken = tokens.access_token;
        calendarToken.refreshToken = tokens.refresh_token;
        calendarToken.tokenExpiry = tokenExpiry;
        calendarToken.scope = tokens.scope || '';
        calendarToken.isActive = true;
        calendarToken.lastSyncError = null;
      } else {
        // Create new token record
        calendarToken = this.tokenRepository.create({
          employeeId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiry,
          scope: tokens.scope || '',
          isActive: true,
        });
      }

      return await this.tokenRepository.save(calendarToken);
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw new BadRequestException('Failed to complete OAuth flow');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(employeeId: string): Promise<GoogleCalendarToken> {
    const token = await this.tokenRepository.findOne({
      where: { employeeId, isActive: true },
    });

    if (!token) {
      throw new NotFoundException('Google Calendar not connected');
    }

    try {
      this.oauth2Client.setCredentials({
        refresh_token: token.refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new BadRequestException('Failed to refresh token');
      }

      // Update token
      token.accessToken = credentials.access_token;
      if (credentials.expiry_date) {
        token.tokenExpiry = new Date(credentials.expiry_date);
      }
      token.lastSyncError = null;

      return await this.tokenRepository.save(token);
    } catch (error) {
      console.error('Token refresh error:', error);
      token.isActive = false;
      token.lastSyncError = 'Token refresh failed. Please reconnect your account.';
      await this.tokenRepository.save(token);
      throw new BadRequestException('Failed to refresh token. Please reconnect your Google Calendar.');
    }
  }

  /**
   * Get valid OAuth2 client for an employee
   */
  async getOAuth2Client(employeeId: string): Promise<Auth.OAuth2Client> {
    let token = await this.tokenRepository.findOne({
      where: { employeeId, isActive: true },
    });

    if (!token) {
      throw new NotFoundException('Google Calendar not connected');
    }

    // Check if token is expired
    const now = new Date();
    if (token.tokenExpiry <= now) {
      // Refresh token
      token = await this.refreshAccessToken(employeeId);
    }

    const client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.redirectUri,
    );

    client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
    });

    return client;
  }

  /**
   * Disconnect Google Calendar for an employee
   */
  async disconnectCalendar(employeeId: string): Promise<void> {
    const token = await this.tokenRepository.findOne({
      where: { employeeId },
    });

    if (token) {
      try {
        // Revoke token with Google
        await this.oauth2Client.revokeToken(token.accessToken);
      } catch (error) {
        console.error('Error revoking token:', error);
        // Continue even if revocation fails
      }

      // Delete token from database
      await this.tokenRepository.remove(token);
    }
  }

  /**
   * Get connection status for an employee
   */
  async getConnectionStatus(employeeId: string): Promise<{
    connected: boolean;
    lastSyncAt?: Date;
    lastSyncError?: string;
  }> {
    const token = await this.tokenRepository.findOne({
      where: { employeeId, isActive: true },
    });

    if (!token) {
      return { connected: false };
    }

    return {
      connected: true,
      lastSyncAt: token.lastSyncAt,
      lastSyncError: token.lastSyncError,
    };
  }

  /**
   * Update last sync status
   */
  async updateSyncStatus(
    employeeId: string,
    success: boolean,
    error?: string,
  ): Promise<void> {
    const token = await this.tokenRepository.findOne({
      where: { employeeId, isActive: true },
    });

    if (token) {
      token.lastSyncAt = new Date();
      token.lastSyncError = error || null;
      await this.tokenRepository.save(token);
    }
  }
}
