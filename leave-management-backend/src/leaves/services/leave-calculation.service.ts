import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { LeaveBalance } from '../entities/leave-balance.entity';
import { LeaveType } from '../../common/enums/leave-type.enum';

@Injectable()
export class LeaveCalculationService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(LeaveBalance)
    private leaveBalanceRepository: Repository<LeaveBalance>,
  ) {}

  /**
   * Calculate pro-rata leave for new joiners based on joining date
   */
  calculateProRataLeave(joiningDate: Date, annualEntitlement: number): number {
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);
    
    // If joined before year start, give full entitlement
    const startDate = joiningDate > yearStart ? joiningDate : yearStart;
    
    // Calculate months remaining in the year
    const monthsRemaining = this.getMonthsRemaining(startDate, yearEnd);
    
    // Pro-rata calculation
    const proRataLeave = (annualEntitlement / 12) * monthsRemaining;
    
    // Round to 2 decimal places
    return Math.round(proRataLeave * 100) / 100;
  }

  /**
   * Calculate working days between two dates (excluding weekends)
   */
  calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // Exclude Saturday (6) and Sunday (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  /**
   * Calculate half days if start/end dates are partial days
   */
  calculateDaysWithHalfDays(
    startDate: Date, 
    endDate: Date, 
    isStartHalfDay: boolean = false,
    isEndHalfDay: boolean = false
  ): number {
    let workingDays = this.calculateWorkingDays(startDate, endDate);
    
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
  async initializeLeaveBalances(employeeId: string, joiningDate: Date): Promise<LeaveBalance[]> {
    const currentYear = new Date().getFullYear();
    const employee = await this.employeeRepository.findOne({ 
      where: { id: employeeId } 
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    const balances = [
      {
        employeeId,
        year: currentYear,
        leaveType: LeaveType.ANNUAL,
        totalAllocated: this.calculateProRataLeave(joiningDate, employee.annualLeaveDays),
        usedDays: 0,
        availableDays: this.calculateProRataLeave(joiningDate, employee.annualLeaveDays),
        carryForward: 0,
      },
      {
        employeeId,
        year: currentYear,
        leaveType: LeaveType.SICK,
        totalAllocated: employee.sickLeaveDays,
        usedDays: 0,
        availableDays: employee.sickLeaveDays,
        carryForward: 0,
      },
      {
        employeeId,
        year: currentYear,
        leaveType: LeaveType.CASUAL,
        totalAllocated: this.calculateProRataLeave(joiningDate, employee.casualLeaveDays),
        usedDays: 0,
        availableDays: this.calculateProRataLeave(joiningDate, employee.casualLeaveDays),
        carryForward: 0,
      },
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
    daysChange: number
  ): Promise<void> {
    const balance = await this.leaveBalanceRepository.findOne({
      where: { employeeId, year, leaveType }
    });

    if (!balance) {
      throw new Error('Leave balance not found');
    }

    balance.usedDays += daysChange;
    balance.availableDays = balance.totalAllocated + balance.carryForward - balance.usedDays;

    // Ensure available days don't go negative
    if (balance.availableDays < 0) {
      throw new Error('Insufficient leave balance');
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
    year?: number
  ): Promise<{ available: boolean; balance: number }> {
    const currentYear = year || new Date().getFullYear();
    
    const balance = await this.leaveBalanceRepository.findOne({
      where: { employeeId, year: currentYear, leaveType }
    });

    if (!balance) {
      return { available: false, balance: 0 };
    }

    return {
      available: balance.availableDays >= requestedDays,
      balance: balance.availableDays
    };
  }

  /**
   * Calculate carry forward for next year (typically for annual leave)
   */
  calculateCarryForward(availableDays: number, maxCarryForward: number = 5): number {
    return Math.min(availableDays, maxCarryForward);
  }

  /**
   * Process year-end carry forward and reset balances
   */
  async processYearEndBalances(year: number): Promise<void> {
    const balances = await this.leaveBalanceRepository.find({
      where: { year },
      relations: ['employee']
    });

    for (const balance of balances) {
      if (balance.leaveType === LeaveType.ANNUAL) {
        const carryForward = this.calculateCarryForward(balance.availableDays);
        
        // Create next year's balance
        const nextYearBalance = this.leaveBalanceRepository.create({
          employeeId: balance.employeeId,
          year: year + 1,
          leaveType: LeaveType.ANNUAL,
          totalAllocated: balance.employee.annualLeaveDays,
          usedDays: 0,
          availableDays: balance.employee.annualLeaveDays + carryForward,
          carryForward,
        });

        await this.leaveBalanceRepository.save(nextYearBalance);
      } else {
        // Sick and casual leave don't carry forward, create fresh allocation
        const nextYearBalance = this.leaveBalanceRepository.create({
          employeeId: balance.employeeId,
          year: year + 1,
          leaveType: balance.leaveType,
          totalAllocated: balance.leaveType === LeaveType.SICK 
            ? balance.employee.sickLeaveDays 
            : balance.employee.casualLeaveDays,
          usedDays: 0,
          availableDays: balance.leaveType === LeaveType.SICK 
            ? balance.employee.sickLeaveDays 
            : balance.employee.casualLeaveDays,
          carryForward: 0,
        });

        await this.leaveBalanceRepository.save(nextYearBalance);
      }
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
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      const remainingDays = daysInMonth - start.getDate() + 1;
      months += remainingDays / daysInMonth;
    } else {
      months += 1; // Full month if starting from 1st
    }
    
    return Math.max(0, months);
  }

  /**
   * Calculate leave accrual for partial months
   */
  calculateMonthlyAccrual(
    annualEntitlement: number,
    joiningDate: Date,
    targetMonth: number,
    targetYear: number
  ): number {
    const monthsWorked = this.getMonthsWorkedUntil(joiningDate, targetMonth, targetYear);
    const monthlyRate = annualEntitlement / 12;
    
    return Math.round(monthlyRate * monthsWorked * 100) / 100;
  }

  private getMonthsWorkedUntil(joiningDate: Date, targetMonth: number, targetYear: number): number {
    const start = new Date(joiningDate);
    const target = new Date(targetYear, targetMonth, 0); // Last day of target month
    
    if (start > target) return 0;
    
    let months = (target.getFullYear() - start.getFullYear()) * 12;
    months += target.getMonth() - start.getMonth() + 1;
    
    return Math.max(0, months);
  }
}