import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Employee } from "../../employees/entities/employee.entity";
import { LeaveBalance } from "../entities/leave-balance.entity";
import { LeaveType } from "../../common/enums/leave-type.enum";
import { Holiday } from "../../holidays/entities/holiday.entity";

@Injectable()
export class LeaveCalculationService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(LeaveBalance)
    private leaveBalanceRepository: Repository<LeaveBalance>,
    @InjectRepository(Holiday)
    private holidayRepository: Repository<Holiday>,
  ) {}

  /**
   * Calculate pro-rata leave for new joiners based on joining date
   * Uses HR-provided calculation table that starts from the beginning of joining month
   */
  calculateProRataLeave(joiningDate: Date, annualEntitlement: number): number {
    const joiningMonth = joiningDate.getMonth() + 1; // 1-based month (Jan=1, Dec=12)

    // HR-provided pro-rata table based on month of joining
    // Values represent leave days available for each leave type based on joining month
    const hrProRataTable = {
      // Privilege/Earned Leave (annual = 12 days typically)
      earned: {
        1: 12,
        2: 11,
        3: 10,
        4: 9,
        5: 8,
        6: 7,
        7: 6,
        8: 5,
        9: 4,
        10: 3,
        11: 2,
        12: 1,
      },
      // Casual Leave (annual = 8 days typically)
      casual: {
        1: 8,
        2: 7,
        3: 7,
        4: 6,
        5: 6,
        6: 5,
        7: 4,
        8: 4,
        9: 3,
        10: 2,
        11: 2,
        12: 1,
      },
      // Sick Leave (annual = 8 days typically)
      sick: {
        1: 8,
        2: 7,
        3: 7,
        4: 6,
        5: 6,
        6: 5,
        7: 4,
        8: 4,
        9: 3,
        10: 2,
        11: 2,
        12: 1,
      },
    };

    // Determine leave type based on annual entitlement
    let leaveType: "earned" | "casual" | "sick";
    if (annualEntitlement === 12) {
      leaveType = "earned";
    } else if (annualEntitlement === 8) {
      // Need to differentiate between casual and sick - for now, assume casual
      // This will be handled differently in the calling function
      leaveType = "casual";
    } else {
      // Fallback to proportional calculation for non-standard entitlements
      const monthsRemaining = 13 - joiningMonth; // Months from joining month to end of year
      return Math.round((annualEntitlement / 12) * monthsRemaining * 100) / 100;
    }

    return hrProRataTable[leaveType][joiningMonth] || 0;
  }

  /**
   * Calculate pro-rata casual leave based on HR table
   */
  calculateCasualLeave(joiningDate: Date): number {
    const joiningMonth = joiningDate.getMonth() + 1;
    const casualTable = {
      1: 8,
      2: 7,
      3: 7,
      4: 6,
      5: 6,
      6: 5,
      7: 4,
      8: 4,
      9: 3,
      10: 2,
      11: 2,
      12: 1,
    };
    return casualTable[joiningMonth] || 0;
  }

  /**
   * Calculate pro-rata sick leave based on HR table
   */
  calculateSickLeave(joiningDate: Date): number {
    const joiningMonth = joiningDate.getMonth() + 1;
    const sickTable = {
      1: 8,
      2: 7,
      3: 7,
      4: 6,
      5: 6,
      6: 5,
      7: 4,
      8: 4,
      9: 3,
      10: 2,
      11: 2,
      12: 1,
    };
    return sickTable[joiningMonth] || 0;
  }

  /**
   * Calculate pro-rata earned/privilege leave based on HR table
   */
  calculateEarnedLeave(joiningDate: Date): number {
    const joiningMonth = joiningDate.getMonth() + 1;
    const earnedTable = {
      1: 12,
      2: 11,
      3: 10,
      4: 9,
      5: 8,
      6: 7,
      7: 6,
      8: 5,
      9: 4,
      10: 3,
      11: 2,
      12: 1,
    };
    return earnedTable[joiningMonth] || 0;
  }

  /**
   * Calculate working days between two dates (excluding weekends and holidays)
   */
  async calculateWorkingDays(startDate: Date, endDate: Date): Promise<number> {
    let count = 0;
    const current = new Date(startDate);

    // Get active holidays for the year(s) covered by the date range
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }

    const holidays = await this.holidayRepository.find({
      where: {
        isActive: true,
      },
    });

    // Create a set of holiday dates for faster lookup
    const holidayDates = new Set(
      holidays
        .filter((h) => years.includes(new Date(h.date).getFullYear()))
        .map((h) => new Date(h.date).toISOString().split("T")[0]),
    );

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      const dateString = current.toISOString().split("T")[0];

      // Exclude Saturday (6), Sunday (0), and holidays
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayDates.has(dateString);

      if (!isWeekend && !isHoliday) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Calculate half days if start/end dates are partial days
   */
  async calculateDaysWithHalfDays(
    startDate: Date,
    endDate: Date,
    isStartHalfDay: boolean = false,
    isEndHalfDay: boolean = false,
  ): Promise<number> {
    let workingDays = await this.calculateWorkingDays(startDate, endDate);

    // Adjust for half days
    if (isStartHalfDay) {
      workingDays -= 0.5;
    }
    if (isEndHalfDay) {
      workingDays -= 0.5;
    }

    return Math.max(0, workingDays);
  }

  /**
   * Initialize leave balances for a new employee
   */
  async initializeLeaveBalances(
    employeeId: string,
    joiningDate: Date,
    manualBalances?: { earned?: number; sick?: number; casual?: number },
  ): Promise<LeaveBalance[]> {
    const currentYear = new Date().getFullYear();
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new Error("Employee not found");
    }

    // Calculate balances based on whether manual balances are provided or using HR table
    const sickBalance =
      manualBalances?.sick !== undefined
        ? manualBalances.sick
        : this.calculateSickLeave(joiningDate);

    const casualBalance =
      manualBalances?.casual !== undefined
        ? manualBalances.casual
        : this.calculateCasualLeave(joiningDate);

    const earnedBalance =
      manualBalances?.earned !== undefined
        ? manualBalances.earned
        : this.calculateEarnedLeave(joiningDate);

    const balances = [
      {
        employeeId,
        year: currentYear,
        leaveType: LeaveType.SICK,
        totalAllocated: sickBalance,
        usedDays: 0,
        availableDays: sickBalance,
        carryForward: 0,
      },
      {
        employeeId,
        year: currentYear,
        leaveType: LeaveType.CASUAL,
        totalAllocated: casualBalance,
        usedDays: 0,
        availableDays: casualBalance,
        carryForward: 0,
      },
      {
        employeeId,
        year: currentYear,
        leaveType: LeaveType.EARNED,
        totalAllocated: earnedBalance,
        usedDays: 0,
        availableDays: earnedBalance,
        carryForward: 0,
      },
      // Note: COMPENSATION leave type is not included as it doesn't affect balance calculations
    ];

    const savedBalances = [];
    for (const balance of balances) {
      const leaveBalance = this.leaveBalanceRepository.create(balance);
      savedBalances.push(await this.leaveBalanceRepository.save(leaveBalance));
    }

    return savedBalances;
  }

  /**
   * Update leave balance after leave approval/cancellation
   */
  async updateLeaveBalance(
    employeeId: string,
    year: number,
    leaveType: LeaveType,
    daysChange: number,
  ): Promise<void> {
    // Skip balance update for compensation off as it doesn't affect leave balances
    if (leaveType === LeaveType.COMPENSATION) {
      return;
    }

    const balance = await this.leaveBalanceRepository.findOne({
      where: { employeeId, year, leaveType },
    });

    if (!balance) {
      throw new Error("Leave balance not found");
    }

    // Ensure all values are properly converted to numbers
    const currentUsedDays = Number(balance.usedDays) || 0;
    const totalAllocated = Number(balance.totalAllocated) || 0;
    const carryForward = Number(balance.carryForward) || 0;
    const daysChangeNum = Number(daysChange) || 0;

    // Validate that we have valid numbers
    if (
      isNaN(currentUsedDays) ||
      isNaN(totalAllocated) ||
      isNaN(carryForward) ||
      isNaN(daysChangeNum)
    ) {
      throw new Error(
        `Invalid numeric values: usedDays=${balance.usedDays}, totalAllocated=${balance.totalAllocated}, carryForward=${balance.carryForward}, daysChange=${daysChange}`,
      );
    }

    // Calculate new values
    const newUsedDays = Number((currentUsedDays + daysChangeNum).toFixed(2));
    const newAvailableDays = Number(
      (totalAllocated + carryForward - newUsedDays).toFixed(2),
    );

    balance.usedDays = newUsedDays;
    balance.availableDays = newAvailableDays;

    // Ensure available days don't go negative
    if (balance.availableDays < 0) {
      throw new Error("Insufficient leave balance");
    }

    await this.leaveBalanceRepository.save(balance);
  }

  /**
   * Check if employee has sufficient leave balance
   */
  async checkLeaveAvailability(
    employeeId: string,
    leaveType: LeaveType,
    requestedDays: number,
    year?: number,
  ): Promise<{ available: boolean; balance: number }> {
    // Compensation off is always available as it doesn't affect leave balances
    if (leaveType === LeaveType.COMPENSATION) {
      return { available: true, balance: 0 };
    }

    const currentYear = year || new Date().getFullYear();

    const balance = await this.leaveBalanceRepository.findOne({
      where: { employeeId, year: currentYear, leaveType },
    });

    if (!balance) {
      return { available: false, balance: 0 };
    }

    return {
      available: balance.availableDays >= requestedDays,
      balance: balance.availableDays,
    };
  }

  /**
   * Calculate carry forward for next year (typically for annual leave)
   */
  calculateCarryForward(
    availableDays: number,
    maxCarryForward: number = 5,
  ): number {
    return Math.min(availableDays, maxCarryForward);
  }

  /**
   * Process year-end carry forward and reset balances
   */
  async processYearEndBalances(year: number): Promise<void> {
    const balances = await this.leaveBalanceRepository.find({
      where: { year },
      relations: ["employee"],
    });

    for (const balance of balances) {
      if (balance.leaveType === LeaveType.EARNED) {
        const carryForward = this.calculateCarryForward(balance.availableDays);

        // Create next year's balance
        const nextYearBalance = this.leaveBalanceRepository.create({
          employeeId: balance.employeeId,
          year: year + 1,
          leaveType: LeaveType.EARNED,
          totalAllocated: balance.employee.annualLeaveDays,
          usedDays: 0,
          availableDays: balance.employee.annualLeaveDays + carryForward,
          carryForward,
        });

        await this.leaveBalanceRepository.save(nextYearBalance);
      } else if (
        balance.leaveType === LeaveType.SICK ||
        balance.leaveType === LeaveType.CASUAL
      ) {
        // Sick and casual leave don't carry forward, create fresh allocation
        const nextYearBalance = this.leaveBalanceRepository.create({
          employeeId: balance.employeeId,
          year: year + 1,
          leaveType: balance.leaveType,
          totalAllocated:
            balance.leaveType === LeaveType.SICK
              ? balance.employee.sickLeaveDays
              : balance.employee.casualLeaveDays,
          usedDays: 0,
          availableDays:
            balance.leaveType === LeaveType.SICK
              ? balance.employee.sickLeaveDays
              : balance.employee.casualLeaveDays,
          carryForward: 0,
        });

        await this.leaveBalanceRepository.save(nextYearBalance);
      }
      // Note: COMPENSATION leave type is not processed as it doesn't affect balance calculations
    }
  }

  /**
   * Get months remaining from a start date to end of year
   */
  private getMonthsRemaining(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);

    let months = (end.getFullYear() - start.getFullYear()) * 12;
    months += end.getMonth() - start.getMonth();

    // Add partial month if start date is not the 1st
    if (start.getDate() > 1) {
      const daysInMonth = new Date(
        start.getFullYear(),
        start.getMonth() + 1,
        0,
      ).getDate();
      const remainingDays = daysInMonth - start.getDate() + 1;
      months += remainingDays / daysInMonth;
    } else {
      months += 1; // Full month if starting from 1st
    }

    return Math.max(0, months);
  }

  /**
   * Get months remaining from start of month to end of year (whole months only)
   */
  private getMonthsRemainingFromMonthStart(
    startDate: Date,
    endDate: Date,
  ): number {
    const start = new Date(startDate);
    const end = new Date(endDate);

    let months = (end.getFullYear() - start.getFullYear()) * 12;
    months += end.getMonth() - start.getMonth();

    // Always count full months since we're starting from month beginning
    months += 1;

    return Math.max(0, months);
  }

  /**
   * Calculate leave accrual for partial months
   */
  calculateMonthlyAccrual(
    annualEntitlement: number,
    joiningDate: Date,
    targetMonth: number,
    targetYear: number,
  ): number {
    const monthsWorked = this.getMonthsWorkedUntil(
      joiningDate,
      targetMonth,
      targetYear,
    );
    const monthlyRate = annualEntitlement / 12;

    return Math.round(monthlyRate * monthsWorked * 100) / 100;
  }

  private getMonthsWorkedUntil(
    joiningDate: Date,
    targetMonth: number,
    targetYear: number,
  ): number {
    // Use the first day of the joining month instead of exact joining date
    const joiningMonthStart = new Date(
      joiningDate.getFullYear(),
      joiningDate.getMonth(),
      1,
    );
    const target = new Date(targetYear, targetMonth, 0); // Last day of target month

    if (joiningMonthStart > target) return 0;

    let months = (target.getFullYear() - joiningMonthStart.getFullYear()) * 12;
    months += target.getMonth() - joiningMonthStart.getMonth() + 1;

    return Math.max(0, months);
  }

  /**
   * Update existing leave balances for an employee
   */
  async updateLeaveBalances(
    employeeId: string,
    balances: { earned?: number; sick?: number; casual?: number },
  ): Promise<void> {
    const currentYear = new Date().getFullYear();

    console.log(
      `Updating leave balances for employee ${employeeId} for year ${currentYear}:`,
      balances,
    );

    // Update each balance type if provided
    if (balances.earned !== undefined) {
      await this.setLeaveBalance(
        employeeId,
        LeaveType.EARNED,
        currentYear,
        balances.earned,
      );
    }

    if (balances.sick !== undefined) {
      await this.setLeaveBalance(
        employeeId,
        LeaveType.SICK,
        currentYear,
        balances.sick,
      );
    }

    if (balances.casual !== undefined) {
      await this.setLeaveBalance(
        employeeId,
        LeaveType.CASUAL,
        currentYear,
        balances.casual,
      );
    }

    console.log("Leave balances updated successfully");
  }

  /**
   * Update a specific leave balance for an employee (manual update)
   */
  private async setLeaveBalance(
    employeeId: string,
    leaveType: LeaveType,
    year: number,
    balance: number,
  ): Promise<void> {
    // Find existing balance record
    const existingBalance = await this.leaveBalanceRepository.findOne({
      where: {
        employeeId,
        leaveType,
        year,
      },
    });

    if (existingBalance) {
      // Update existing balance
      existingBalance.availableDays = balance;
      existingBalance.totalAllocated = balance; // Also update total allocated
      await this.leaveBalanceRepository.save(existingBalance);
      console.log(
        `Updated ${leaveType} balance to ${balance} for employee ${employeeId}`,
      );
    } else {
      // Create new balance record if it doesn't exist
      const newBalance = this.leaveBalanceRepository.create({
        employeeId,
        leaveType,
        year,
        availableDays: balance,
        totalAllocated: balance, // Set allocated to the same value initially
        usedDays: 0,
        carryForward: 0,
      });
      await this.leaveBalanceRepository.save(newBalance);
      console.log(
        `Created new ${leaveType} balance of ${balance} for employee ${employeeId}`,
      );
    }
  }
}
