import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeaveRequest } from '../entities/leave-request.entity';
import { LeaveStatus } from '../../common/enums/leave-status.enum';

@Injectable()
export class LeaveCleanupService {
  private readonly logger = new Logger(LeaveCleanupService.name);

  constructor(
    @InjectRepository(LeaveRequest)
    private leaveRequestRepository: Repository<LeaveRequest>,
  ) {}

  /**
   * Remove cancelled leave requests older than 1 month
   * Runs on the 1st day of every month at 2 AM
   */
  @Cron('0 2 1 * *', {
    name: 'cleanupCancelledLeaveRequests',
    timeZone: 'UTC',
  })
  async cleanupCancelledLeaveRequests(): Promise<void> {
    try {
      this.logger.log('Starting cleanup of cancelled leave requests...');

      // Calculate cutoff date (1 month ago from now)
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
      cutoffDate.setHours(23, 59, 59, 999); // End of the cutoff month

      // Find cancelled leave requests that are older than the cutoff date
      const cancelledRequests = await this.leaveRequestRepository
        .createQueryBuilder('leaveRequest')
        .where('leaveRequest.status = :status', { status: LeaveStatus.CANCELLED })
        .andWhere('leaveRequest.endDate < :cutoffDate', { cutoffDate })
        .getMany();

      if (cancelledRequests.length === 0) {
        this.logger.log('No cancelled leave requests found for cleanup');
        return;
      }

      // Delete the cancelled requests
      const result = await this.leaveRequestRepository.remove(cancelledRequests);

      this.logger.log(
        `Successfully cleaned up ${result.length} cancelled leave requests older than ${cutoffDate.toISOString().split('T')[0]}`
      );

      // Log summary of cleaned up requests for audit purposes
      const summary = cancelledRequests.map(req => ({
        id: req.id,
        employeeId: req.employeeId,
        startDate: req.startDate,
        endDate: req.endDate,
        leaveType: req.leaveType,
      }));

      this.logger.debug('Cleaned up requests:', JSON.stringify(summary, null, 2));

    } catch (error) {
      this.logger.error('Failed to cleanup cancelled leave requests', error);
    }
  }

  /**
   * Manual cleanup method for testing or one-time execution
   */
  async manualCleanup(): Promise<{ deletedCount: number; deletedRequests: any[] }> {
    this.logger.log('Starting manual cleanup of cancelled leave requests...');

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    cutoffDate.setHours(23, 59, 59, 999);

    const cancelledRequests = await this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .leftJoinAndSelect('leaveRequest.employee', 'employee')
      .where('leaveRequest.status = :status', { status: LeaveStatus.CANCELLED })
      .andWhere('leaveRequest.endDate < :cutoffDate', { cutoffDate })
      .getMany();

    if (cancelledRequests.length === 0) {
      return { deletedCount: 0, deletedRequests: [] };
    }

    const deletedRequests = cancelledRequests.map(req => ({
      id: req.id,
      employeeName: req.employee ? `${req.employee.firstName} ${req.employee.lastName}` : 'Unknown',
      leaveType: req.leaveType,
      startDate: req.startDate,
      endDate: req.endDate,
      cancelledDate: req.approvedAt, // This might be when it was cancelled
    }));

    await this.leaveRequestRepository.remove(cancelledRequests);

    this.logger.log(`Manual cleanup completed: ${cancelledRequests.length} records deleted`);

    return {
      deletedCount: cancelledRequests.length,
      deletedRequests,
    };
  }

  /**
   * Get statistics about cancelled requests eligible for cleanup
   */
  async getCleanupStats(): Promise<{
    totalCancelled: number;
    eligibleForCleanup: number;
    cutoffDate: string;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    cutoffDate.setHours(23, 59, 59, 999);

    const totalCancelled = await this.leaveRequestRepository.count({
      where: { status: LeaveStatus.CANCELLED },
    });

    const eligibleForCleanup = await this.leaveRequestRepository.count({
      where: {
        status: LeaveStatus.CANCELLED,
        endDate: { $lt: cutoffDate } as any, // TypeORM syntax for less than
      },
    });

    return {
      totalCancelled,
      eligibleForCleanup,
      cutoffDate: cutoffDate.toISOString().split('T')[0],
    };
  }
}