import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LeaveBalance } from "../entities/leave-balance.entity";
import { LeaveBalanceHistory } from "../entities/leave-balance-history.entity";
import { LeaveType } from "../../common/enums/leave-type.enum";
import { MailService } from "../../mail/mail.service";
import { Employee } from "../../employees/entities/employee.entity";

@Injectable()
export class YearEndBalanceService {
  private readonly logger = new Logger(YearEndBalanceService.name);

  constructor(
    @InjectRepository(LeaveBalance)
    private leaveBalanceRepository: Repository<LeaveBalance>,
    @InjectRepository(LeaveBalanceHistory)
    private leaveBalanceHistoryRepository: Repository<LeaveBalanceHistory>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    private mailService: MailService,
  ) {}

  /**
   * Handles the year-end reset process for leave balances
   * 1. Archives current year balances to leave_balances_history
   * 2. Resets values in leave_balances for the next year
   * 3. Logs the process
   * 4. Optionally notifies employees
   */
  async processYearEndReset(notifyEmployees = false): Promise<{
    archivedCount: number;
    resetCount: number;
    timestamp: Date;
  }> {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const timestamp = new Date();

    this.logger.log(`Starting year-end leave balance reset process from ${currentYear} to ${nextYear}`);

    // 1. Get all current year balances
    const currentBalances = await this.leaveBalanceRepository.find({
      where: { year: currentYear },
      relations: ["employee"],
    });

    this.logger.log(`Found ${currentBalances.length} leave balance records to process`);

    // 2. Archive current balances to history
    const archivedBalances = [];
    for (const balance of currentBalances) {
      const historyRecord = this.leaveBalanceHistoryRepository.create({
        employeeId: balance.employeeId,
        year: balance.year,
        leaveType: balance.leaveType,
        totalAllocated: balance.totalAllocated,
        usedDays: balance.usedDays,
        availableDays: balance.availableDays,
        carryForward: balance.carryForward,
        archivedAt: timestamp,
        // null for system process
        archivedById: null,
      });

      archivedBalances.push(
        await this.leaveBalanceHistoryRepository.save(historyRecord)
      );
    }

    this.logger.log(`Archived ${archivedBalances.length} leave balance records to history`);

    // 3. Reset values in leave_balances for next year
    const resetBalances = [];
    const defaultValues = {
      [LeaveType.EARNED]: 12,
      [LeaveType.SICK]: 8,
      [LeaveType.CASUAL]: 8,
      [LeaveType.COMPENSATION]: 0, // Compensation leave doesn't have default allocation
    };

    for (const balance of currentBalances) {
      // Get the default value based on leave type
      const totalAllocated = defaultValues[balance.leaveType] || 0;

      // Create a new balance for next year
      const newBalance = this.leaveBalanceRepository.create({
        employeeId: balance.employeeId,
        year: nextYear,
        leaveType: balance.leaveType,
        totalAllocated: totalAllocated,
        usedDays: 0,
        availableDays: totalAllocated,
        carryForward: 0,
      });

      resetBalances.push(await this.leaveBalanceRepository.save(newBalance));

      // 4. Optional: Notify employees of their new leave balances
      if (notifyEmployees && balance.employee?.user?.email) {
        try {
          await this.mailService.sendLeaveBalanceResetNotification(
            balance.employee.user.email,
            balance.employee.firstName,
            nextYear,
            resetBalances.filter(rb => rb.employeeId === balance.employeeId)
          );
        } catch (error) {
          this.logger.error(`Failed to send notification to employee ${balance.employeeId}`, error.stack);
        }
      }
    }

    this.logger.log(`Reset ${resetBalances.length} leave balances for year ${nextYear}`);

    return {
      archivedCount: archivedBalances.length,
      resetCount: resetBalances.length,
      timestamp,
    };
  }

  /**
   * Manual reset for a specific employee (for testing or mid-year corrections)
   */
  async resetLeaveBalancesForEmployee(
    employeeId: string, 
    targetYear: number,
    archivedById?: string,
    notifyEmployee = false
  ): Promise<{
    archivedCount: number;
    resetCount: number;
    timestamp: Date;
  }> {
    const currentYear = targetYear - 1;
    const timestamp = new Date();

    this.logger.log(`Starting leave balance reset for employee ${employeeId} from ${currentYear} to ${targetYear}`);

    // 1. Get employee's current balances
    const currentBalances = await this.leaveBalanceRepository.find({
      where: { 
        employeeId: employeeId,
        year: currentYear
      },
      relations: ["employee", "employee.user"],
    });

    if (!currentBalances.length) {
      throw new Error(`No leave balances found for employee ${employeeId} for year ${currentYear}`);
    }

    // 2. Archive current balances to history
    const archivedBalances = [];
    for (const balance of currentBalances) {
      const historyRecord = this.leaveBalanceHistoryRepository.create({
        employeeId: balance.employeeId,
        year: balance.year,
        leaveType: balance.leaveType,
        totalAllocated: balance.totalAllocated,
        usedDays: balance.usedDays,
        availableDays: balance.availableDays,
        carryForward: balance.carryForward,
        archivedAt: timestamp,
        archivedById: archivedById || null,
      });

      archivedBalances.push(
        await this.leaveBalanceHistoryRepository.save(historyRecord)
      );
    }

    // 3. Reset values for the target year
    const resetBalances = [];
    const defaultValues = {
      [LeaveType.EARNED]: 12,
      [LeaveType.SICK]: 8,
      [LeaveType.CASUAL]: 8,
      [LeaveType.COMPENSATION]: 0,
    };

    for (const balance of currentBalances) {
      // Check if a balance for the target year already exists
      const existingBalance = await this.leaveBalanceRepository.findOne({
        where: {
          employeeId: balance.employeeId,
          year: targetYear,
          leaveType: balance.leaveType,
        },
      });

      const totalAllocated = defaultValues[balance.leaveType] || 0;

      if (existingBalance) {
        // Update existing balance
        existingBalance.totalAllocated = totalAllocated;
        existingBalance.usedDays = 0;
        existingBalance.availableDays = totalAllocated;
        existingBalance.carryForward = 0;
        resetBalances.push(await this.leaveBalanceRepository.save(existingBalance));
      } else {
        // Create new balance for target year
        const newBalance = this.leaveBalanceRepository.create({
          employeeId: balance.employeeId,
          year: targetYear,
          leaveType: balance.leaveType,
          totalAllocated: totalAllocated,
          usedDays: 0,
          availableDays: totalAllocated,
          carryForward: 0,
        });
        resetBalances.push(await this.leaveBalanceRepository.save(newBalance));
      }
    }

    // 4. Notify employee if requested
    if (notifyEmployee && currentBalances[0]?.employee?.user?.email) {
      try {
        await this.mailService.sendLeaveBalanceResetNotification(
          currentBalances[0].employee.user.email,
          currentBalances[0].employee.firstName,
          targetYear,
          resetBalances
        );
      } catch (error) {
        this.logger.error(`Failed to send notification to employee ${employeeId}`, error.stack);
      }
    }

    return {
      archivedCount: archivedBalances.length,
      resetCount: resetBalances.length,
      timestamp,
    };
  }
}
