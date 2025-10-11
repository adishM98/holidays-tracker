import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { LeaveRequest } from "./entities/leave-request.entity";
import { LeaveBalance } from "./entities/leave-balance.entity";
import { Employee } from "../employees/entities/employee.entity";
import { User } from "../users/entities/user.entity";
import { CreateLeaveRequestDto } from "./dto/create-leave-request.dto";
import { UpdateLeaveRequestDto } from "./dto/update-leave-request.dto";
import { ApproveLeaveRequestDto } from "./dto/approve-leave-request.dto";
import { RejectLeaveRequestDto } from "./dto/reject-leave-request.dto";
import { LeaveCalculationService } from "./services/leave-calculation.service";
import { MailService } from "../mail/mail.service";
import { Holiday } from "../holidays/entities/holiday.entity";
import { LeaveStatus } from "../common/enums/leave-status.enum";
import { LeaveType } from "../common/enums/leave-type.enum";
import { CalendarSyncService } from "../google-calendar/services/calendar-sync.service";

@Injectable()
export class LeavesService {
  constructor(
    @InjectRepository(LeaveRequest)
    private leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(LeaveBalance)
    private leaveBalanceRepository: Repository<LeaveBalance>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Holiday)
    private holidayRepository: Repository<Holiday>,
    private leaveCalculationService: LeaveCalculationService,
    private mailService: MailService,
    @Inject(forwardRef(() => CalendarSyncService))
    private calendarSyncService: CalendarSyncService,
  ) {}

  async createLeaveRequest(
    employeeId: string,
    createLeaveRequestDto: CreateLeaveRequestDto,
  ): Promise<LeaveRequest> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: ["manager", "user"],
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    const startDate = new Date(createLeaveRequestDto.startDate);
    const endDate = new Date(createLeaveRequestDto.endDate);
    const isHalfDay = createLeaveRequestDto.isHalfDay || false;

    // Validate date range
    if (startDate > endDate) {
      throw new BadRequestException("Start date cannot be after end date");
    }

    // For half-day leaves, start and end date must be the same
    if (isHalfDay && startDate.getTime() !== endDate.getTime()) {
      throw new BadRequestException("Half-day leaves can only be applied for a single day");
    }

    // Allow applications from today onwards (employees can fall sick today)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today

    // Ensure startDate is also set to start of day for proper comparison
    const startDateOnly = new Date(startDate);
    startDateOnly.setHours(0, 0, 0, 0);

    if (startDateOnly < today) {
      throw new BadRequestException("Cannot apply for leave in the past");
    }

    // Calculate working days (automatically excludes weekends and holidays)
    let daysCount = await this.leaveCalculationService.calculateWorkingDays(
      startDate,
      endDate,
    );

    // For half-day leaves, set the count to 0.5
    if (isHalfDay) {
      daysCount = 0.5;
    }

    // Ensure there are working days in the range
    if (daysCount === 0) {
      throw new BadRequestException(
        "The selected date range contains no working days. Please select dates that include at least one working day.",
      );
    }

    // Check leave balance availability
    const year = startDate.getFullYear();
    const availability =
      await this.leaveCalculationService.checkLeaveAvailability(
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
      isHalfDay,
      reason: createLeaveRequestDto.reason,
      status: LeaveStatus.PENDING,
      approvedBy: employee.manager?.id, // Assign manager as approver
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
  }): Promise<{
    requests: LeaveRequest[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const offset = (page - 1) * limit;

    const queryBuilder = this.leaveRequestRepository
      .createQueryBuilder("leaveRequest")
      .leftJoinAndSelect("leaveRequest.employee", "employee")
      .leftJoinAndSelect("employee.user", "user")
      .leftJoinAndSelect("employee.department", "department")
      .leftJoinAndSelect("employee.manager", "manager")
      .leftJoinAndSelect("leaveRequest.approver", "approver");

    if (options?.status) {
      queryBuilder.andWhere("leaveRequest.status = :status", {
        status: options.status,
      });
    }

    if (options?.employeeId) {
      queryBuilder.andWhere("leaveRequest.employeeId = :employeeId", {
        employeeId: options.employeeId,
      });
    }

    if (options?.managerId) {
      queryBuilder.andWhere("employee.managerId = :managerId", {
        managerId: options.managerId,
      });
    }

    const [requests, total] = await queryBuilder
      .orderBy("leaveRequest.createdAt", "DESC")
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { requests, total, page, limit };
  }

  async findOne(id: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findOne({
      where: { id },
      relations: [
        "employee",
        "employee.user",
        "employee.department",
        "employee.manager",
        "approver",
      ],
    });

    if (!leaveRequest) {
      throw new NotFoundException("Leave request not found");
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
      throw new BadRequestException("Leave request is not in pending status");
    }

    // Update leave balance
    const year = new Date(leaveRequest.startDate).getFullYear();
    await this.leaveCalculationService.updateLeaveBalance(
      leaveRequest.employeeId,
      year,
      leaveRequest.leaveType,
      Number(leaveRequest.daysCount),
    );

    // Update request status
    leaveRequest.status = LeaveStatus.APPROVED;

    // Check if approver is an employee (has employee record) or admin (user only)
    const employeeApprover = await this.employeeRepository.findOne({
      where: { id: approverId },
    });

    if (employeeApprover) {
      // Manager/Employee approval - set the employee ID
      leaveRequest.approvedBy = approverId;
    } else {
      // Admin approval - leave approvedBy as null since admin has no employee record
      leaveRequest.approvedBy = null;
    }

    leaveRequest.approvedAt = new Date();

    const updatedRequest = await this.leaveRequestRepository.save(leaveRequest);

    // Sync to calendar (async - don't wait)
    this.calendarSyncService.syncLeaveToCalendar(updatedRequest).catch(err => {
      console.error('Calendar sync failed:', err);
    });

    // Send notification to employee
    // Use the employeeApprover we already found, but with relations if it exists
    let approver = null;
    if (employeeApprover) {
      approver = await this.employeeRepository.findOne({
        where: { id: approverId },
        relations: ["user"],
      });
    }

    // If no employee found (admin case), try to find user directly
    let approverName = approver?.fullName;
    if (!approver) {
      const userApprover = await this.userRepository.findOne({
        where: { id: approverId },
      });
      approverName = userApprover?.email || "Admin";
    }

    if (leaveRequest.employee.user) {
      await this.mailService.sendLeaveStatusNotification(
        leaveRequest.employee.user.email,
        leaveRequest.leaveType,
        new Date(leaveRequest.startDate),
        new Date(leaveRequest.endDate),
        "approved",
        approverName,
      );
    }

    return this.findOne(updatedRequest.id);
  }

  async updateLeaveRequest(
    requestId: string,
    updateLeaveRequestDto: UpdateLeaveRequestDto,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.findOne(requestId);

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException("Can only update pending leave requests");
    }

    // Update the leave request with new data
    if (updateLeaveRequestDto.leaveType) {
      leaveRequest.leaveType = updateLeaveRequestDto.leaveType;
    }
    if (updateLeaveRequestDto.startDate) {
      leaveRequest.startDate = new Date(updateLeaveRequestDto.startDate);
    }
    if (updateLeaveRequestDto.endDate) {
      leaveRequest.endDate = new Date(updateLeaveRequestDto.endDate);
    }
    if (updateLeaveRequestDto.reason !== undefined) {
      leaveRequest.reason = updateLeaveRequestDto.reason;
    }

    // Recalculate days count if dates changed
    if (updateLeaveRequestDto.startDate || updateLeaveRequestDto.endDate) {
      const startDate = leaveRequest.startDate;
      const endDate = leaveRequest.endDate;

      if (startDate > endDate) {
        throw new BadRequestException(
          "Start date must be before or equal to end date",
        );
      }

      const timeDiff = endDate.getTime() - startDate.getTime();
      const daysCount = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
      leaveRequest.daysCount = daysCount;

      // Validate leave availability with new values
      const year = startDate.getFullYear();
      const availability =
        await this.leaveCalculationService.checkLeaveAvailability(
          leaveRequest.employeeId,
          leaveRequest.leaveType,
          daysCount,
          year,
        );

      if (!availability.available) {
        throw new BadRequestException(
          `Insufficient leave balance. Available: ${availability.balance} days, Requested: ${daysCount} days`,
        );
      }
    }

    const updatedRequest = await this.leaveRequestRepository.save(leaveRequest);

    // Update calendar if leave is approved
    if (updatedRequest.status === LeaveStatus.APPROVED) {
      this.calendarSyncService.updateLeaveInCalendar(updatedRequest).catch(err => {
        console.error('Calendar update failed:', err);
      });
    }

    return updatedRequest;
  }

  async deleteLeaveRequest(requestId: string): Promise<void> {
    console.log("LeavesService: Starting delete for request ID:", requestId);

    const leaveRequest = await this.findOne(requestId);
    console.log(
      "LeavesService: Found leave request:",
      leaveRequest.id,
      "Status:",
      leaveRequest.status,
    );

    if (leaveRequest.status === LeaveStatus.APPROVED) {
      console.log(
        "LeavesService: Restoring leave balance for approved request",
      );
      // If approved, we need to restore the leave balance by adding back the days
      const year = new Date(leaveRequest.startDate).getFullYear();

      // Find the leave balance record
      const leaveBalance = await this.leaveBalanceRepository.findOne({
        where: {
          employeeId: leaveRequest.employeeId,
          year,
          leaveType: leaveRequest.leaveType,
        },
      });

      if (leaveBalance) {
        console.log(
          "LeavesService: Updating leave balance, restoring",
          leaveRequest.daysCount,
          "days",
        );
        // Ensure all values are properly converted to numbers
        const currentUsedDays = Number(leaveBalance.usedDays) || 0;
        const daysToRestore = Number(leaveRequest.daysCount) || 0;
        const totalAllocated = Number(leaveBalance.totalAllocated) || 0;
        const carryForward = Number(leaveBalance.carryForward) || 0;

        const newUsedDays = Math.max(0, currentUsedDays - daysToRestore);
        const newAvailableDays = totalAllocated + carryForward - newUsedDays;

        leaveBalance.usedDays = Number(newUsedDays.toFixed(2));
        leaveBalance.availableDays = Number(newAvailableDays.toFixed(2));
        await this.leaveBalanceRepository.save(leaveBalance);
      }
    }

    console.log("LeavesService: Removing leave request from database");

    // Remove from calendar before deleting from database
    await this.calendarSyncService.removeLeaveFromCalendar(requestId);

    await this.leaveRequestRepository.remove(leaveRequest);
    console.log("LeavesService: Delete operation completed successfully");
  }

  async rejectLeaveRequest(
    requestId: string,
    approverId: string,
    rejectDto: RejectLeaveRequestDto,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.findOne(requestId);

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException("Leave request is not in pending status");
    }

    // Update request status
    leaveRequest.status = LeaveStatus.REJECTED;

    // Check if approver is an employee (has employee record) or admin (user only)
    const employeeApprover = await this.employeeRepository.findOne({
      where: { id: approverId },
    });

    if (employeeApprover) {
      // Manager/Employee rejection - set the employee ID
      leaveRequest.approvedBy = approverId;
    } else {
      // Admin rejection - leave approvedBy as null since admin has no employee record
      leaveRequest.approvedBy = null;
    }

    leaveRequest.approvedAt = new Date();
    leaveRequest.rejectionReason = rejectDto.rejectionReason;

    const updatedRequest = await this.leaveRequestRepository.save(leaveRequest);

    // Send notification to employee
    // Use the employeeApprover we already found, but with relations if it exists
    let approver = null;
    if (employeeApprover) {
      approver = await this.employeeRepository.findOne({
        where: { id: approverId },
        relations: ["user"],
      });
    }

    // If no employee found (admin case), try to find user directly
    let approverName = approver?.fullName;
    if (!approver) {
      const userApprover = await this.userRepository.findOne({
        where: { id: approverId },
      });
      approverName = userApprover?.email || "Admin";
    }

    if (leaveRequest.employee.user) {
      await this.mailService.sendLeaveStatusNotification(
        leaveRequest.employee.user.email,
        leaveRequest.leaveType,
        new Date(leaveRequest.startDate),
        new Date(leaveRequest.endDate),
        "rejected",
        approverName,
        rejectDto.rejectionReason,
      );
    }

    // Remove from calendar when rejected
    this.calendarSyncService.removeLeaveFromCalendar(requestId).catch(err => {
      console.error('Calendar removal failed:', err);
    });

    return this.findOne(updatedRequest.id);
  }

  async cancelLeaveRequest(
    requestId: string,
    employeeId: string,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.findOne(requestId);

    if (leaveRequest.employeeId !== employeeId) {
      throw new ForbiddenException(
        "You can only cancel your own leave requests",
      );
    }

    if (
      leaveRequest.status !== LeaveStatus.PENDING &&
      leaveRequest.status !== LeaveStatus.APPROVED
    ) {
      throw new BadRequestException(
        "Can only cancel pending or approved leave requests",
      );
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
    const cancelledRequest = await this.leaveRequestRepository.save(leaveRequest);

    // Remove from calendar when cancelled
    this.calendarSyncService.removeLeaveFromCalendar(requestId).catch(err => {
      console.error('Calendar removal failed:', err);
    });

    return cancelledRequest;
  }

  async getLeaveBalance(
    employeeId: string,
    year?: number,
  ): Promise<LeaveBalance[]> {
    const targetYear = year || new Date().getFullYear();

    return this.leaveBalanceRepository.find({
      where: { employeeId, year: targetYear },
      relations: ["employee"],
      order: { leaveType: "ASC" },
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
      .createQueryBuilder("leaveRequest")
      .leftJoinAndSelect("leaveRequest.employee", "employee")
      .leftJoinAndSelect("employee.user", "user")
      .leftJoinAndSelect("employee.department", "department")
      .leftJoinAndSelect("leaveRequest.approver", "approver")
      .leftJoinAndSelect("approver.user", "approverUser")
      .where("leaveRequest.status IN (:...statuses)", {
        statuses: [LeaveStatus.APPROVED, LeaveStatus.PENDING],
      })
      .andWhere(
        "(leaveRequest.startDate BETWEEN :startDate AND :endDate OR leaveRequest.endDate BETWEEN :startDate AND :endDate)",
        { startDate, endDate },
      );

    if (departmentId) {
      queryBuilder.andWhere("employee.departmentId = :departmentId", {
        departmentId,
      });
    }

    return queryBuilder.orderBy("leaveRequest.startDate", "ASC").getMany();
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
        appliedAt: Between(startOfYear, endOfYear),
      },
    });

    const pendingRequests = await this.leaveRequestRepository.count({
      where: {
        status: LeaveStatus.PENDING,
        appliedAt: Between(startOfYear, endOfYear),
      },
    });

    const approvedRequests = await this.leaveRequestRepository.count({
      where: {
        status: LeaveStatus.APPROVED,
        appliedAt: Between(startOfYear, endOfYear),
      },
    });

    const rejectedRequests = await this.leaveRequestRepository.count({
      where: {
        status: LeaveStatus.REJECTED,
        appliedAt: Between(startOfYear, endOfYear),
      },
    });

    const byType = await this.leaveRequestRepository
      .createQueryBuilder("leaveRequest")
      .select("leaveRequest.leaveType", "type")
      .addSelect("COUNT(*)", "count")
      .where("EXTRACT(YEAR FROM leaveRequest.appliedAt) = :year", {
        year: targetYear,
      })
      .groupBy("leaveRequest.leaveType")
      .getRawMany();

    const byMonth = await this.leaveRequestRepository
      .createQueryBuilder("leaveRequest")
      .select("EXTRACT(MONTH FROM leaveRequest.appliedAt)", "month")
      .addSelect("COUNT(*)", "count")
      .where("EXTRACT(YEAR FROM leaveRequest.appliedAt) = :year", {
        year: targetYear,
      })
      .groupBy("EXTRACT(MONTH FROM leaveRequest.appliedAt)")
      .orderBy("month", "ASC")
      .getRawMany();

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      byType: byType.map((item) => ({
        type: item.type,
        count: parseInt(item.count),
      })),
      byMonth: byMonth.map((item) => ({
        month: monthNames[parseInt(item.month) - 1],
        count: parseInt(item.count),
      })),
    };
  }

  async getBulkLeaveBalances(year?: number, departmentId?: string): Promise<Record<string, any>> {
    const targetYear = year || new Date().getFullYear();

    // Build employee query with optional department filter
    const employeeQueryBuilder = this.employeeRepository
      .createQueryBuilder("employee")
      .select(["employee.id"]);

    if (departmentId) {
      employeeQueryBuilder.where("employee.departmentId = :departmentId", { departmentId });
    }

    const employees = await employeeQueryBuilder.getMany();
    const employeeIds = employees.map(emp => emp.id);

    if (employeeIds.length === 0) {
      return {};
    }

    // Fetch all leave balances in one query
    const leaveBalances = await this.leaveBalanceRepository
      .createQueryBuilder("balance")
      .where("balance.employeeId IN (:...employeeIds)", { employeeIds })
      .andWhere("balance.year = :year", { year: targetYear })
      .getMany();

    // Organize balances by employee ID
    const balancesByEmployee: Record<string, any> = {};

    for (const balance of leaveBalances) {
      if (!balancesByEmployee[balance.employeeId]) {
        balancesByEmployee[balance.employeeId] = {
          year: targetYear,
          employeeId: balance.employeeId,
          balances: []
        };
      }

      balancesByEmployee[balance.employeeId].balances.push({
        leaveType: balance.leaveType,
        totalAllocated: balance.totalAllocated,
        usedDays: balance.usedDays,
        availableDays: balance.availableDays,
      });
    }

    // Add empty balance objects for employees without balances
    for (const employeeId of employeeIds) {
      if (!balancesByEmployee[employeeId]) {
        balancesByEmployee[employeeId] = {
          year: targetYear,
          employeeId,
          balances: [
            { leaveType: 'earned', totalAllocated: 0, usedDays: 0, availableDays: 0 },
            { leaveType: 'sick', totalAllocated: 0, usedDays: 0, availableDays: 0 },
            { leaveType: 'casual', totalAllocated: 0, usedDays: 0, availableDays: 0 }
          ]
        };
      }
    }

    return balancesByEmployee;
  }
}
