import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { YearEndBalanceService } from './year-end-balance.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LeaveBalanceSchedulerService {
  private readonly logger = new Logger(LeaveBalanceSchedulerService.name);
  private enableNotifications: boolean;

  constructor(
    private yearEndBalanceService: YearEndBalanceService,
    private configService: ConfigService,
  ) {
    this.enableNotifications = this.configService.get<string>('ENABLE_YEAR_END_NOTIFICATIONS') === 'true';
  }

  /**
   * Run at 11:30 PM on December 31st of every year
   * This is scheduled a bit before midnight to ensure it completes before the new year
   */
  @Cron('0 30 23 31 12 *')
  async handleYearEndLeaveBalanceReset() {
    try {
      this.logger.log('Starting scheduled year-end leave balance reset');
      
      const result = await this.yearEndBalanceService.processYearEndReset(
        this.enableNotifications
      );
      
      this.logger.log(
        `Year-end leave balance reset completed successfully: ${result.archivedCount} records archived, ${result.resetCount} records reset at ${result.timestamp}`
      );
    } catch (error) {
      this.logger.error('Error during scheduled year-end leave balance reset', error.stack);
    }
  }
}
