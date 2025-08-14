import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LeaveRequest } from './entities/leave-request.entity';
import { LeaveBalance } from './entities/leave-balance.entity';
import { Employee } from '../employees/entities/employee.entity';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ApproveLeaveRequestDto } from './dto/approve-leave-request.dto';
import { RejectLeaveRequestDto } from './dto/reject-leave-request.dto';
import { LeaveCalculationService } from './services/leave-calculation.service';
import { MailService } from '../mail/mail.service';
import { LeaveStatus } from '../common/enums/leave-status.enum';
import { LeaveType } from '../common/enums/leave-type.enum';

@Injectable()
export class LeavesService {
  constructor(
    @InjectRepository(LeaveRequest)
    private leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(LeaveBalance)
    private leaveBalanceRepository: Repository<LeaveBalance>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    private leaveCalculationService: LeaveCalculationService,
    private mailService: MailService,
  ) {}

  async createLeaveRequest(
    employeeId: string,
    createLeaveRequestDto: CreateLeaveRequestDto,
  ): Promise<LeaveRequest> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: ['manager', 'user'],
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const startDate = new Date(createLeaveRequestDto.startDate);
    const endDate = new Date(createLeaveRequestDto.endDate);

    // Validate date range
    if (startDate > endDate) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    if (startDate < new Date()) {
      throw new BadRequestException('Cannot apply for leave in the past');
    }

    // Calculate working days
    const daysCount = this.leaveCalculationService.calculateWorkingDays(startDate, endDate);

    // Check leave balance availability
    const year = startDate.getFullYear();
    const availability = await this.leaveCalculationService.checkLeaveAvailability(
      employeeId,
      createLeaveRequestDto.leaveType,
      daysCount,
      year,
    );

    if (!availability.available) {
      throw new BadRequestException(
        `Insufficient leave balance. Available: ${availability.balance} days, Requested: ${daysCount} days`,
      );
    }

    // Create leave request
    const leaveRequest = this.leaveRequestRepository.create({
      employeeId,
      leaveType: createLeaveRequestDto.leaveType,
      startDate,
      endDate,
      daysCount,
      reason: createLeaveRequestDto.reason,
      status: LeaveStatus.PENDING,
    });

    const savedRequest = await this.leaveRequestRepository.save(leaveRequest);

    // Send notification to manager if exists
    if (employee.manager && employee.manager.user) {
      await this.mailService.sendLeaveRequestNotification(
        employee.manager.user.email,
        employee.fullName,
        createLeaveRequestDto.leaveType,
        startDate,
        endDate,
        createLeaveRequestDto.reason,
      );
    }

    return this.findOne(savedRequest.id);
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    status?: LeaveStatus;
    employeeId?: string;
    managerId?: string;
  }): Promise<{ requests: LeaveRequest[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const offset = (page - 1) * limit;

    const queryBuilder = this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .leftJoinAndSelect('leaveRequest.employee', 'employee')
      .leftJoinAndSelect('employee.user', 'user')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('leaveRequest.approver', 'approver');

    if (options?.status) {
      queryBuilder.andWhere('leaveRequest.status = :status', { status: options.status });
    }

    if (options?.employeeId) {
      queryBuilder.andWhere('leaveRequest.employeeId = :employeeId', { employeeId: options.employeeId });
    }

    if (options?.managerId) {
      queryBuilder.andWhere('employee.managerId = :managerId', { managerId: options.managerId });
    }

    const [requests, total] = await queryBuilder
      .orderBy('leaveRequest.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { requests, total, page, limit };
  }

  async findOne(id: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findOne({
      where: { id },
      relations: ['employee', 'employee.user', 'employee.department', 'approver'],
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    return leaveRequest;
  }

  async approveLeaveRequest(
    requestId: string,
    approverId: string,
    approveDto: ApproveLeaveRequestDto,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.findOne(requestId);

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Leave request is not in pending status');
    }

    // Update leave balance
    const year = leaveRequest.startDate.getFullYear();
    await this.leaveCalculationService.updateLeaveBalance(
      leaveRequest.employeeId,
      year,
      leaveRequest.leaveType,
      leaveRequest.daysCount,
    );

    // Update request status
    leaveRequest.status = LeaveStatus.APPROVED;
    leaveRequest.approvedBy = approverId;
    leaveRequest.approvedAt = new Date();

    const updatedRequest = await this.leaveRequestRepository.save(leaveRequest);

    // Send notification to employee
    const approver = await this.employeeRepository.findOne({
      where: { id: approverId },
      relations: ['user'],
    });

    if (leaveRequest.employee.user) {
      await this.mailService.sendLeaveStatusNotification(
        leaveRequest.employee.user.email,
        leaveRequest.leaveType,
        leaveRequest.startDate,
        leaveRequest.endDate,
        'approved',
        approver?.fullName,
      );
    }

    return this.findOne(updatedRequest.id);
  }

  async rejectLeaveRequest(
    requestId: string,
    approverId: string,
    rejectDto: RejectLeaveRequestDto,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.findOne(requestId);

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Leave request is not in pending status');
    }

    // Update request status
    leaveRequest.status = LeaveStatus.REJECTED;
    leaveRequest.approvedBy = approverId;
    leaveRequest.approvedAt = new Date();
    leaveRequest.rejectionReason = rejectDto.rejectionReason;

    const updatedRequest = await this.leaveRequestRepository.save(leaveRequest);

    // Send notification to employee
    const approver = await this.employeeRepository.findOne({
      where: { id: approverId },
      relations: ['user'],
    });

    if (leaveRequest.employee.user) {
      await this.mailService.sendLeaveStatusNotification(
        leaveRequest.employee.user.email,
        leaveRequest.leaveType,
        leaveRequest.startDate,
        leaveRequest.endDate,
        'rejected',
        approver?.fullName,
        rejectDto.rejectionReason,
      );
    }

    return this.findOne(updatedRequest.id);
  }

  async cancelLeaveRequest(requestId: string, employeeId: string): Promise<LeaveRequest> {
    const leaveRequest = await this.findOne(requestId);

    if (leaveRequest.employeeId !== employeeId) {
      throw new ForbiddenException('You can only cancel your own leave requests');
    }

    if (leaveRequest.status !== LeaveStatus.PENDING && leaveRequest.status !== LeaveStatus.APPROVED) {
      throw new BadRequestException('Can only cancel pending or approved leave requests');
    }

    // If approved request is being cancelled, restore leave balance
    if (leaveRequest.status === LeaveStatus.APPROVED) {
      const year = leaveRequest.startDate.getFullYear();
      await this.leaveCalculationService.updateLeaveBalance(
        leaveRequest.employeeId,
        year,
        leaveRequest.leaveType,
        -leaveRequest.daysCount, // Negative to restore balance
      );
    }

    leaveRequest.status = LeaveStatus.CANCELLED;
    return this.leaveRequestRepository.save(leaveRequest);
  }

  async getLeaveBalance(employeeId: string, year?: number): Promise<LeaveBalance[]> {
    const targetYear = year || new Date().getFullYear();

    return this.leaveBalanceRepository.find({
      where: { employeeId, year: targetYear },
      relations: ['employee'],
      order: { leaveType: 'ASC' },
    });
  }

  async getLeaveCalendar(
    month: number,
    year: number,
    departmentId?: string,
  ): Promise<LeaveRequest[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const queryBuilder = this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .leftJoinAndSelect('leaveRequest.employee', 'employee')
      .leftJoinAndSelect('employee.user', 'user')
      .leftJoinAndSelect('employee.department', 'department')
      .where('leaveRequest.status = :status', { status: LeaveStatus.APPROVED })
      .andWhere(
        '(leaveRequest.startDate BETWEEN :startDate AND :endDate OR leaveRequest.endDate BETWEEN :startDate AND :endDate)',
        { startDate, endDate },
      );

    if (departmentId) {
      queryBuilder.andWhere('employee.departmentId = :departmentId', { departmentId });
    }

    return queryBuilder
      .orderBy('leaveRequest.startDate', 'ASC')
      .getMany();
  }

  async getLeaveStats(year?: number): Promise<{
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    byType: { type: string; count: number }[];
    byMonth: { month: string; count: number }[];
  }> {
    const targetYear = year || new Date().getFullYear();
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31);

    const totalRequests = await this.leaveRequestRepository.count({
      where: { 
        appliedAt: Between(startOfYear, endOfYear)
      },
    });

    const pendingRequests = await this.leaveRequestRepository.count({
      where: { 
        status: LeaveStatus.PENDING,
        appliedAt: Between(startOfYear, endOfYear)
      },
    });

    const approvedRequests = await this.leaveRequestRepository.count({
      where: { 
        status: LeaveStatus.APPROVED,
        appliedAt: Between(startOfYear, endOfYear)
      },
    });

    const rejectedRequests = await this.leaveRequestRepository.count({
      where: { 
        status: LeaveStatus.REJECTED,
        appliedAt: Between(startOfYear, endOfYear)
      },
    });

    const byType = await this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .select('leaveRequest.leaveType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('EXTRACT(YEAR FROM leaveRequest.appliedAt) = :year', { year: targetYear })
      .groupBy('leaveRequest.leaveType')
      .getRawMany();

    const byMonth = await this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .select('EXTRACT(MONTH FROM leaveRequest.appliedAt)', 'month')
      .addSelect('COUNT(*)', 'count')
      .where('EXTRACT(YEAR FROM leaveRequest.appliedAt) = :year', { year: targetYear })
      .groupBy('EXTRACT(MONTH FROM leaveRequest.appliedAt)')
      .orderBy('month', 'ASC')
      .getRawMany();

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      byType: byType.map(item => ({
        type: item.type,
        count: parseInt(item.count),
      })),
      byMonth: byMonth.map(item => ({
        month: monthNames[parseInt(item.month) - 1],
        count: parseInt(item.count),
      })),
    };
  }
}