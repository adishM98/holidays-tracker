import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { LeaveRequest } from '../entities/leave-request.entity';
import { LeaveBalance } from '../entities/leave-balance.entity';
import { LeaveStatus } from '../../common/enums/leave-status.enum';
import { SettingsService } from '../../settings/settings.service';

@Injectable()
export class LeaveAutoApproveService {
  private readonly logger = new Logger(LeaveAutoApproveService.name);

  constructor(
    @InjectRepository(LeaveRequest)
    private leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(LeaveBalance)
    private leaveBalanceRepository: Repository<LeaveBalance>,
    private settingsService: SettingsService,
  ) {}

  /**
   * Run daily at 1:00 AM to auto-approve pending leaves
   * Cron format: second minute hour day month dayOfWeek
   */
  @Cron('0 0 1 * * *')
  async handleAutoApproval() {
    try {
      // Check if auto-approval is enabled
      const isEnabled = await this.settingsService.getAutoApproveEnabled();

      if (!isEnabled) {
        this.logger.log('Auto-approval is disabled. Skipping.');
        return;
      }

      this.logger.log('Starting auto-approval process for pending leaves');

      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find all pending leave requests where the requested day has passed
      const pendingLeaves = await this.leaveRequestRepository.find({
        where: {
          status: LeaveStatus.PENDING,
          startDate: LessThan(today),
        },
        relations: ['employee', 'employee.user'],
      });

      this.logger.log(`Found ${pendingLeaves.length} pending leaves to auto-approve`);

      let approvedCount = 0;
      const errors: string[] = [];

      for (const leave of pendingLeaves) {
        try {
          // Update leave balance
          const year = new Date(leave.startDate).getFullYear();

          // Find the leave balance record
          const leaveBalance = await this.leaveBalanceRepository.findOne({
            where: {
              employeeId: leave.employeeId,
              year,
              leaveType: leave.leaveType,
            },
          });

          if (leaveBalance) {
            // Deduct the days from available balance
            const currentUsedDays = Number(leaveBalance.usedDays) || 0;
            const daysToDeduct = Number(leave.daysCount) || 0;
            const totalAllocated = Number(leaveBalance.totalAllocated) || 0;
            const carryForward = Number(leaveBalance.carryForward) || 0;

            const newUsedDays = currentUsedDays + daysToDeduct;
            const newAvailableDays = totalAllocated + carryForward - newUsedDays;

            leaveBalance.usedDays = Number(newUsedDays.toFixed(2));
            leaveBalance.availableDays = Number(newAvailableDays.toFixed(2));

            await this.leaveBalanceRepository.save(leaveBalance);
          } else {
            this.logger.warn(
              `No leave balance found for employee ${leave.employeeId}, year ${year}, type ${leave.leaveType}`
            );
          }

          // Update leave request status
          leave.status = LeaveStatus.APPROVED;
          leave.approvedAt = new Date();
          leave.approvedBy = null; // System auto-approval, no approver

          await this.leaveRequestRepository.save(leave);

          approvedCount++;

          this.logger.log(
            `Auto-approved leave request ${leave.id} for employee ${leave.employee.fullName} ` +
            `(${leave.leaveType}, ${leave.daysCount} days, ${leave.startDate.toISOString().split('T')[0]})`
          );
        } catch (error) {
          const errorMessage = `Failed to auto-approve leave ${leave.id}: ${error.message}`;
          this.logger.error(errorMessage, error.stack);
          errors.push(errorMessage);
        }
      }

      this.logger.log(
        `Auto-approval completed: ${approvedCount} leaves approved, ${errors.length} errors`
      );

      if (errors.length > 0) {
        this.logger.error('Auto-approval errors:', errors.join('; '));
      }

      return {
        success: true,
        approvedCount,
        totalProcessed: pendingLeaves.length,
        errors,
      };
    } catch (error) {
      this.logger.error('Error during auto-approval process', error.stack);
      throw error;
    }
  }

  /**
   * Manual trigger for auto-approval (for testing or admin use)
   */
  async triggerAutoApproval() {
    this.logger.log('Manual auto-approval trigger initiated');
    return this.handleAutoApproval();
  }
}
