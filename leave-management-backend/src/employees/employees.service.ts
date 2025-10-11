import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like } from "typeorm";
import { Employee } from "./entities/employee.entity";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { LeaveCalculationService } from "../leaves/services/leave-calculation.service";
import { User } from "../users/entities/user.entity";
import { UserRole } from "../common/enums/user-role.enum";
import { LeaveRequest } from "../leaves/entities/leave-request.entity";
import { LeaveBalance } from "../leaves/entities/leave-balance.entity";
import { Department } from "../departments/entities/department.entity";
import { LeaveType } from "../common/enums/leave-type.enum";
import {
  BulkImportEmployeeDto,
  BulkImportResultDto,
  BulkImportReportDto,
} from "./dto/bulk-import-employee.dto";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import * as csv from "csv-parser";
import { Readable } from "stream";

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    private leaveCalculationService: LeaveCalculationService,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    // Check if email already exists in employees
    const existingEmployee = await this.employeeRepository.findOne({
      where: { email: createEmployeeDto.email },
    });
    if (existingEmployee) {
      throw new ConflictException("Email already exists");
    }

    // Check if email already exists in users
    const existingUser = await this.userRepository.findOne({
      where: { email: createEmployeeDto.email },
    });
    if (existingUser) {
      throw new ConflictException("Email already exists");
    }

    // Check if employeeId already exists
    if (createEmployeeDto.employeeId) {
      const existingEmployeeId = await this.employeeRepository.findOne({
        where: { employeeId: createEmployeeDto.employeeId },
      });
      if (existingEmployeeId) {
        throw new ConflictException("Employee ID already exists");
      }
    }

    // Create user record without password (they'll set it via invite)
    const now = new Date();
    const inviteExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    const user = this.userRepository.create({
      email: createEmployeeDto.email,
      passwordHash: "", // Empty password hash - they'll set it via invite
      role: UserRole.EMPLOYEE,
      isActive: false, // Set to false initially until they complete onboarding
      mustChangePassword: false,
      inviteStatus: "invited",
      invitedAt: now,
      inviteExpiresAt: inviteExpiresAt,
    });
    const savedUser = await this.userRepository.save(user);

    const employee = this.employeeRepository.create({
      ...createEmployeeDto,
      userId: savedUser.id,
      joiningDate: new Date(createEmployeeDto.joiningDate),
      probationEndDate: createEmployeeDto.probationEndDate
        ? new Date(createEmployeeDto.probationEndDate)
        : null,
    });

    const savedEmployee = await this.employeeRepository.save(employee);

    // Initialize leave balances for the new employee
    const manualBalances =
      createEmployeeDto.useManualBalances && createEmployeeDto.manualBalances
        ? createEmployeeDto.manualBalances
        : undefined;

    await this.leaveCalculationService.initializeLeaveBalances(
      savedEmployee.id,
      savedEmployee.joiningDate,
      manualBalances,
    );

    // If a manager was assigned during creation, promote them to manager role if needed
    if (createEmployeeDto.managerId) {
      await this.autoPromoteToManager(createEmployeeDto.managerId);
    }

    return savedEmployee;
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: string;
  }): Promise<{
    employees: Employee[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const offset = (page - 1) * limit;

    const queryBuilder = this.employeeRepository
      .createQueryBuilder("employee")
      .leftJoinAndSelect("employee.user", "user")
      .leftJoinAndSelect("employee.department", "department")
      .leftJoinAndSelect("employee.manager", "manager");

    // Add search filter
    if (options?.search) {
      queryBuilder.where(
        "(employee.firstName ILIKE :search OR employee.lastName ILIKE :search OR employee.employeeId ILIKE :search)",
        { search: `%${options.search}%` },
      );
    }

    // Add department filter
    if (options?.departmentId && options.departmentId !== "all") {
      queryBuilder.andWhere("employee.departmentId = :departmentId", {
        departmentId: options.departmentId,
      });
    }

    const [employees, total] = await queryBuilder
      .orderBy("employee.createdAt", "DESC")
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { employees, total, page, limit };
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: [
        "user",
        "department",
        "manager",
        "subordinates",
        "leaveBalances",
      ],
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    return employee;
  }

  async findByEmployeeId(employeeId: string): Promise<Employee | null> {
    return this.employeeRepository.findOne({
      where: { employeeId },
      relations: ["user", "department", "manager"],
    });
  }

  async findByUserId(userId: string): Promise<Employee | null> {
    return this.employeeRepository.findOne({
      where: { userId },
      relations: ["user", "department", "manager", "leaveBalances"],
    });
  }

  async findSubordinates(managerId: string): Promise<Employee[]> {
    return this.employeeRepository.find({
      where: { managerId },
      relations: ["user", "department"],
    });
  }

  async update(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
  ): Promise<Employee> {
    console.log("=== EMPLOYEE UPDATE START ===");
    console.log("Employee ID:", id);
    console.log("Update DTO:", JSON.stringify(updateEmployeeDto, null, 2));

    const employee = await this.findOne(id);
    console.log(
      "Current employee before update:",
      JSON.stringify(
        {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          departmentId: employee.departmentId,
          position: employee.position,
          managerId: employee.managerId,
        },
        null,
        2,
      ),
    );

    // Check if email is being changed and already exists
    if (updateEmployeeDto.email && updateEmployeeDto.email !== employee.email) {
      const existingEmployee = await this.employeeRepository.findOne({
        where: { email: updateEmployeeDto.email },
      });
      if (existingEmployee) {
        throw new ConflictException("Email already exists");
      }
    }

    // Check if employeeId is being changed and already exists
    if (
      updateEmployeeDto.employeeId &&
      updateEmployeeDto.employeeId !== employee.employeeId
    ) {
      const existingEmployeeId = await this.employeeRepository.findOne({
        where: { employeeId: updateEmployeeDto.employeeId },
      });
      if (existingEmployeeId) {
        throw new ConflictException("Employee ID already exists");
      }
    }

    // Explicitly set each field to ensure TypeORM detects changes
    if (updateEmployeeDto.employeeId !== undefined) {
      employee.employeeId = updateEmployeeDto.employeeId;
    }
    if (updateEmployeeDto.firstName !== undefined) {
      employee.firstName = updateEmployeeDto.firstName;
    }
    if (updateEmployeeDto.lastName !== undefined) {
      employee.lastName = updateEmployeeDto.lastName;
    }
    if (updateEmployeeDto.phone !== undefined) {
      employee.phone = updateEmployeeDto.phone;
    }
    if (updateEmployeeDto.departmentId !== undefined) {
      employee.departmentId = updateEmployeeDto.departmentId;
    }
    if (updateEmployeeDto.position !== undefined) {
      employee.position = updateEmployeeDto.position;
    }
    if (updateEmployeeDto.managerId !== undefined) {
      employee.managerId = updateEmployeeDto.managerId;
    }
    if (updateEmployeeDto.joiningDate !== undefined) {
      employee.joiningDate = new Date(updateEmployeeDto.joiningDate);
    }
    if (updateEmployeeDto.probationEndDate !== undefined) {
      employee.probationEndDate = updateEmployeeDto.probationEndDate
        ? new Date(updateEmployeeDto.probationEndDate)
        : null;
    }
    if (updateEmployeeDto.annualLeaveDays !== undefined) {
      employee.annualLeaveDays = updateEmployeeDto.annualLeaveDays;
    }
    if (updateEmployeeDto.sickLeaveDays !== undefined) {
      employee.sickLeaveDays = updateEmployeeDto.sickLeaveDays;
    }
    if (updateEmployeeDto.casualLeaveDays !== undefined) {
      employee.casualLeaveDays = updateEmployeeDto.casualLeaveDays;
    }
    if (updateEmployeeDto.email !== undefined) {
      employee.email = updateEmployeeDto.email;
    }

    console.log(
      "Employee after manual assignment:",
      JSON.stringify(
        {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          departmentId: employee.departmentId,
          position: employee.position,
          managerId: employee.managerId,
        },
        null,
        2,
      ),
    );

    // Use repository update method for more direct database update
    const updateData: Partial<Employee> = {};

    if (updateEmployeeDto.employeeId !== undefined)
      updateData.employeeId = updateEmployeeDto.employeeId;
    if (updateEmployeeDto.firstName !== undefined)
      updateData.firstName = updateEmployeeDto.firstName;
    if (updateEmployeeDto.lastName !== undefined)
      updateData.lastName = updateEmployeeDto.lastName;
    if (updateEmployeeDto.phone !== undefined)
      updateData.phone = updateEmployeeDto.phone;
    if (updateEmployeeDto.departmentId !== undefined)
      updateData.departmentId = updateEmployeeDto.departmentId;
    if (updateEmployeeDto.position !== undefined)
      updateData.position = updateEmployeeDto.position;
    if (updateEmployeeDto.managerId !== undefined)
      updateData.managerId = updateEmployeeDto.managerId;
    if (updateEmployeeDto.joiningDate !== undefined)
      updateData.joiningDate = new Date(updateEmployeeDto.joiningDate);
    if (updateEmployeeDto.probationEndDate !== undefined) {
      updateData.probationEndDate = updateEmployeeDto.probationEndDate
        ? new Date(updateEmployeeDto.probationEndDate)
        : null;
    }
    if (updateEmployeeDto.annualLeaveDays !== undefined)
      updateData.annualLeaveDays = updateEmployeeDto.annualLeaveDays;
    if (updateEmployeeDto.sickLeaveDays !== undefined)
      updateData.sickLeaveDays = updateEmployeeDto.sickLeaveDays;
    if (updateEmployeeDto.casualLeaveDays !== undefined)
      updateData.casualLeaveDays = updateEmployeeDto.casualLeaveDays;
    if (updateEmployeeDto.email !== undefined)
      updateData.email = updateEmployeeDto.email;

    console.log("Direct update data:", JSON.stringify(updateData, null, 2));

    // Perform direct repository update
    await this.employeeRepository.update(id, updateData);

    // Handle manager role changes
    if (updateEmployeeDto.managerId !== undefined) {
      // If manager was assigned, promote new manager
      if (updateEmployeeDto.managerId !== null) {
        await this.autoPromoteToManager(updateEmployeeDto.managerId);
      }

      // If manager was removed, check if old manager should be demoted
      if (
        employee.managerId &&
        updateEmployeeDto.managerId !== employee.managerId
      ) {
        await this.autoDemoteFromManager(employee.managerId);
      }
    }

    // Fetch and return updated employee
    const savedEmployee = await this.findOne(id);
    console.log(
      "Employee after update:",
      JSON.stringify(
        {
          id: savedEmployee.id,
          firstName: savedEmployee.firstName,
          lastName: savedEmployee.lastName,
          departmentId: savedEmployee.departmentId,
          position: savedEmployee.position,
          managerId: savedEmployee.managerId,
        },
        null,
        2,
      ),
    );
    console.log("=== EMPLOYEE UPDATE END ===");

    return savedEmployee;
  }

  async remove(id: string): Promise<void> {
    // Start a transaction to ensure all deletions happen atomically
    await this.employeeRepository.manager.transaction(async (manager) => {
      // First, find the employee to get their user ID
      const employee = await manager.findOne(Employee, {
        where: { id },
        relations: ["user"],
      });

      if (!employee) {
        throw new NotFoundException("Employee not found");
      }

      console.log(
        `Starting cascading delete for employee: ${employee.firstName} ${employee.lastName} (ID: ${id})`,
      );

      // Step 1: Remove this employee as manager from any departments
      await manager.query(
        `UPDATE departments SET manager_id = NULL WHERE manager_id = $1`,
        [id],
      );
      console.log("Updated departments to remove as manager");

      // Step 2: Remove this employee as manager from any subordinate employees
      await manager.query(
        `UPDATE employees SET manager_id = NULL WHERE manager_id = $1`,
        [id],
      );
      console.log("Updated subordinate employees to remove as manager");

      // Step 3: Delete leave requests (should cascade but doing explicitly for clarity)
      const deletedRequests = await manager.delete(LeaveRequest, {
        employeeId: id,
      });
      console.log(`Deleted ${deletedRequests.affected || 0} leave requests`);

      // Step 4: Delete leave balances (should cascade but doing explicitly for clarity)
      const deletedBalances = await manager.delete(LeaveBalance, {
        employeeId: id,
      });
      console.log(`Deleted ${deletedBalances.affected || 0} leave balances`);

      // Step 5: Delete the employee record
      const deletedEmployee = await manager.delete(Employee, { id });
      console.log(`Deleted employee record: ${deletedEmployee.affected || 0}`);

      // Step 6: Delete the associated user account (should cascade but doing explicitly)
      if (employee.user) {
        // This will also cascade delete any password_reset_tokens
        const deletedUser = await manager.delete(User, {
          id: employee.user.id,
        });
        console.log(`Deleted user account: ${deletedUser.affected || 0}`);
      }

      console.log("Cascading delete completed successfully");
    });
  }

  /**
   * Auto-promote employee to manager role when they get their first direct report
   */
  private async autoPromoteToManager(managerId: string): Promise<void> {
    try {
      console.log(`🔄 Checking auto-promotion for manager ID: ${managerId}`);

      // Find the manager employee record
      const manager = await this.employeeRepository.findOne({
        where: { id: managerId },
        relations: ["user"],
      });

      if (!manager || !manager.user) {
        console.log(
          `❌ Manager not found or has no user account: ${managerId}`,
        );
        return;
      }

      // Check if user is already a manager or admin
      if (
        manager.user.role === UserRole.MANAGER ||
        manager.user.role === UserRole.ADMIN
      ) {
        console.log(
          `✅ User ${manager.user.email} is already ${manager.user.role}`,
        );
        return;
      }

      // Check how many direct reports this manager will have
      const directReports = await this.employeeRepository.count({
        where: { managerId: managerId },
      });

      console.log(
        `📊 ${manager.user.email} will have ${directReports} direct reports`,
      );

      // If they have at least 1 direct report and are currently an employee, promote them
      if (directReports >= 1 && manager.user.role === UserRole.EMPLOYEE) {
        await this.userRepository.update(manager.user.id, {
          role: UserRole.MANAGER,
        });

        console.log(
          `🎉 Auto-promoted ${manager.user.email} from employee to manager`,
        );
      }
    } catch (error) {
      console.error(
        `❌ Error in auto-promotion for manager ${managerId}:`,
        error,
      );
      // Don't throw error - this should not break the main employee update
    }
  }

  /**
   * Auto-demote manager to employee role when they no longer have direct reports
   */
  private async autoDemoteFromManager(managerId: string): Promise<void> {
    try {
      console.log(`🔄 Checking auto-demotion for manager ID: ${managerId}`);

      // Find the manager employee record
      const manager = await this.employeeRepository.findOne({
        where: { id: managerId },
        relations: ["user"],
      });

      if (!manager || !manager.user) {
        console.log(
          `❌ Manager not found or has no user account: ${managerId}`,
        );
        return;
      }

      // Only consider demotion if user is currently a manager (not admin)
      if (manager.user.role !== UserRole.MANAGER) {
        console.log(
          `✅ User ${manager.user.email} is ${manager.user.role}, no demotion needed`,
        );
        return;
      }

      // Check how many direct reports this manager currently has
      const directReports = await this.employeeRepository.count({
        where: { managerId: managerId },
      });

      console.log(
        `📊 ${manager.user.email} currently has ${directReports} direct reports`,
      );

      // If they have no direct reports, demote them to employee
      if (directReports === 0) {
        await this.userRepository.update(manager.user.id, {
          role: UserRole.EMPLOYEE,
        });

        console.log(
          `⬇️ Auto-demoted ${manager.user.email} from manager to employee`,
        );
      }
    } catch (error) {
      console.error(
        `❌ Error in auto-demotion for manager ${managerId}:`,
        error,
      );
      // Don't throw error - this should not break the main employee update
    }
  }

  async getEmployeeStats(): Promise<{
    total: number;
    active: number;
    onProbation: number;
    byDepartment: { department: string; count: number }[];
  }> {
    const total = await this.employeeRepository.count();

    const activeEmployees = await this.employeeRepository.count({
      where: { user: { isActive: true } },
      relations: ["user"],
    });

    const onProbation = await this.employeeRepository.count({
      where: {
        probationEndDate: new Date() > new Date() ? undefined : new Date(),
      },
    });

    const byDepartmentQuery = await this.employeeRepository
      .createQueryBuilder("employee")
      .leftJoin("employee.department", "department")
      .select("department.name", "department")
      .addSelect("COUNT(employee.id)", "count")
      .groupBy("department.name")
      .getRawMany();

    return {
      total,
      active: activeEmployees,
      onProbation,
      byDepartment: byDepartmentQuery.map((item) => ({
        department: item.department || "No Department",
        count: parseInt(item.count),
      })),
    };
  }

  private generateSecurePassword(): string {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async resetEmployeePassword(
    employeeId: string,
  ): Promise<{ tempPassword: string }> {
    const employee = await this.findOne(employeeId);
    if (!employee.user) {
      throw new NotFoundException("User account not found for this employee");
    }

    // Generate a secure temporary password
    const tempPassword = this.generateSecurePassword();

    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Update user's password and set mustChangePassword flag
    await this.userRepository.update(employee.user.id, {
      passwordHash: hashedPassword,
      mustChangePassword: true,
    });

    return { tempPassword };
  }

  async deactivateEmployee(employeeId: string): Promise<void> {
    const employee = await this.findOne(employeeId);
    if (!employee.user) {
      throw new NotFoundException("User account not found for this employee");
    }

    // Deactivate the user account
    await this.userRepository.update(employee.user.id, {
      isActive: false,
    });
  }

  async activateEmployee(employeeId: string): Promise<void> {
    const employee = await this.findOne(employeeId);
    if (!employee.user) {
      throw new NotFoundException("User account not found for this employee");
    }

    // Activate the user account
    await this.userRepository.update(employee.user.id, {
      isActive: true,
      inviteStatus: "active",
    });
  }

  async regenerateInvite(employeeId: string): Promise<void> {
    const employee = await this.findOne(employeeId);
    if (!employee.user) {
      throw new NotFoundException("User account not found for this employee");
    }

    const now = new Date();
    const inviteExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Reset invite status and extend expiry
    await this.userRepository.update(employee.user.id, {
      inviteStatus: "invited",
      invitedAt: now,
      inviteExpiresAt: inviteExpiresAt,
      isActive: false, // Keep inactive until they complete onboarding
      passwordHash: "", // Clear any existing password
    });
  }

  async checkAndUpdateExpiredInvites(): Promise<void> {
    const now = new Date();

    // Find all users with expired invites
    const expiredInvites = await this.userRepository
      .createQueryBuilder("user")
      .where("user.inviteStatus = :status", { status: "invited" })
      .andWhere("user.inviteExpiresAt < :now", { now })
      .getMany();

    // Update their status to invite_expired
    for (const user of expiredInvites) {
      await this.userRepository.update(user.id, {
        inviteStatus: "invite_expired",
      });
    }
  }

  async updateEmployeeLeaveBalance(
    employeeId: string,
    data: { earnedBalance: number; sickBalance: number; casualBalance: number },
  ): Promise<void> {
    console.log(`Updating leave balance for employee ${employeeId}:`, data);

    // Use the LeaveCalculationService to update balances
    await this.leaveCalculationService.updateLeaveBalances(employeeId, {
      earned: data.earnedBalance,
      sick: data.sickBalance,
      casual: data.casualBalance,
    });
  }

  /**
   * Parse CSV file buffer and validate data
   */
  private async parseCsvFile(buffer: Buffer): Promise<BulkImportEmployeeDto[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from(buffer.toString());

      stream
        .pipe(
          csv({
            headers: [
              "employeeId",
              "firstName",
              "lastName",
              "email",
              "department",
              "position",
              "manager",
              "joiningDate",
              "earnedBalance",
              "sickBalance",
              "casualBalance",
            ],
          }),
        )
        .on("data", (data) => {
          // Skip header row
          if (data.employeeId === "Employee ID") return;

          // Transform and clean data
          const cleaned = {
            employeeId: data.employeeId?.trim(),
            firstName: data.firstName?.trim(),
            lastName: data.lastName?.trim() || "",
            email: data.email?.trim().toLowerCase(),
            department: data.department?.trim(),
            position: data.position?.trim() || "",
            manager: data.manager?.trim() || "",
            joiningDate: data.joiningDate?.trim(),
            earnedBalance: data.earnedBalance
              ? parseFloat(data.earnedBalance)
              : undefined,
            sickBalance: data.sickBalance
              ? parseFloat(data.sickBalance)
              : undefined,
            casualBalance: data.casualBalance
              ? parseFloat(data.casualBalance)
              : undefined,
          };

          results.push(cleaned);
        })
        .on("end", () => {
          resolve(results);
        })
        .on("error", (error) => {
          reject(error);
        });
    });
  }

  /**
   * Validate CSV row data
   */
  private async validateCsvRow(
    row: BulkImportEmployeeDto,
    rowIndex: number,
    existingEmployeeIds: Set<string>,
    existingEmails: Set<string>,
    departments: Map<string, string>,
    managers: Map<string, string>,
    csvEmployeeIds: Set<string> = new Set(),
  ): Promise<string[]> {
    const errors: string[] = [];

    // Required fields validation
    if (!row.employeeId) {
      errors.push("Employee ID is required");
    } else if (existingEmployeeIds.has(row.employeeId)) {
      errors.push("Employee ID already exists in database");
    }

    if (!row.firstName) {
      errors.push("First Name is required");
    }

    if (!row.email) {
      errors.push("Email is required");
    } else {
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email)) {
        errors.push("Invalid email format");
      } else if (existingEmails.has(row.email)) {
        errors.push("Email already exists in database");
      }
    }

    if (!row.department) {
      errors.push("Department is required");
    } else if (!departments.has(row.department)) {
      errors.push(`Department "${row.department}" not found`);
    }

    if (!row.joiningDate) {
      errors.push("Joining Date is required");
    } else {
      // Date format validation (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(row.joiningDate)) {
        errors.push("Invalid date format. Use YYYY-MM-DD");
      } else {
        const date = new Date(row.joiningDate);
        if (isNaN(date.getTime())) {
          errors.push("Invalid date");
        }
      }
    }

    // Manager validation (optional)
    if (
      row.manager &&
      !managers.has(row.manager) &&
      !csvEmployeeIds.has(row.manager)
    ) {
      errors.push(`Manager "${row.manager}" not found by employee ID or email`);
    }

    // Leave balance validation (optional, but must be non-negative)
    if (
      row.earnedBalance !== undefined &&
      (isNaN(row.earnedBalance) || row.earnedBalance < 0)
    ) {
      errors.push("Earned/Privilege Balance must be a non-negative number");
    }
    if (
      row.sickBalance !== undefined &&
      (isNaN(row.sickBalance) || row.sickBalance < 0)
    ) {
      errors.push("Sick Leave Balance must be a non-negative number");
    }
    if (
      row.casualBalance !== undefined &&
      (isNaN(row.casualBalance) || row.casualBalance < 0)
    ) {
      errors.push("Casual Leave Balance must be a non-negative number");
    }

    return errors;
  }

  /**
   * Create lookup maps for departments and managers
   */
  private async createLookupMaps(): Promise<{
    departments: Map<string, string>;
    managers: Map<string, string>;
  }> {
    // Get all departments
    const departments = await this.departmentRepository.find();
    const departmentMap = new Map<string, string>();
    departments.forEach((dept) => {
      departmentMap.set(dept.name, dept.id);
    });

    // Get all employees to use as potential managers
    const employees = await this.employeeRepository.find();
    const managerMap = new Map<string, string>();
    employees.forEach((emp) => {
      managerMap.set(emp.employeeId, emp.id); // Map by employee ID
      managerMap.set(emp.email, emp.id); // Map by email
    });

    return { departments: departmentMap, managers: managerMap };
  }

  /**
   * Get existing employee IDs and emails to check for duplicates
   */
  private async getExistingEmployeeData(): Promise<{
    employeeIds: Set<string>;
    emails: Set<string>;
  }> {
    const employees = await this.employeeRepository.find({
      select: ["employeeId", "email"],
    });

    const employeeIds = new Set(employees.map((e) => e.employeeId));
    const emails = new Set(employees.map((e) => e.email));

    return { employeeIds, emails };
  }

  /**
   * Bulk import employees from CSV
   */
  async bulkImportEmployees(csvBuffer: Buffer): Promise<BulkImportResultDto> {
    console.log("Starting bulk employee import...");

    try {
      // Parse CSV data
      const csvData = await this.parseCsvFile(csvBuffer);
      console.log(`Parsed ${csvData.length} rows from CSV`);

      if (csvData.length === 0) {
        return {
          success: false,
          message: "CSV file is empty or contains no valid data",
          summary: {
            totalRows: 0,
            successfulImports: 0,
            failedImports: 0,
            errors: [],
          },
        };
      }

      // Create lookup maps
      const { departments, managers } = await this.createLookupMaps();
      const { employeeIds: existingEmployeeIds, emails: existingEmails } =
        await this.getExistingEmployeeData();

      // Validate all rows first
      const validationResults: Array<{
        row: BulkImportEmployeeDto;
        rowIndex: number;
        errors: string[];
      }> = [];

      // Create set of employee IDs in the CSV for manager validation
      const csvEmployeeIds = new Set<string>();
      csvData.forEach((row) => {
        if (row.employeeId) {
          csvEmployeeIds.add(row.employeeId);
        }
      });

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const errors = await this.validateCsvRow(
          row,
          i + 1,
          existingEmployeeIds,
          existingEmails,
          departments,
          managers,
          csvEmployeeIds,
        );

        validationResults.push({
          row,
          rowIndex: i + 1,
          errors,
        });

        // Add to existing sets to prevent duplicates within the CSV
        if (!errors.some((e) => e.includes("Employee ID"))) {
          existingEmployeeIds.add(row.employeeId);
        }
        if (!errors.some((e) => e.includes("Email"))) {
          existingEmails.add(row.email);
        }
      }

      // Separate valid and invalid rows
      const validRows = validationResults.filter((r) => r.errors.length === 0);
      const invalidRows = validationResults.filter((r) => r.errors.length > 0);

      console.log(
        `Validation complete. Valid: ${validRows.length}, Invalid: ${invalidRows.length}`,
      );

      // Process valid rows in transaction
      const successfulImports: BulkImportReportDto[] = [];
      const failedImports: Array<{
        row: number;
        employeeId: string;
        email: string;
        errors: string[];
      }> = [];

      // Add validation errors to failed imports
      invalidRows.forEach((invalid) => {
        failedImports.push({
          row: invalid.rowIndex,
          employeeId: invalid.row.employeeId || "N/A",
          email: invalid.row.email || "N/A",
          errors: invalid.errors,
        });
      });

      // Process valid rows using transaction with two-phase import
      await this.employeeRepository.manager.transaction(async (manager) => {
        const createdEmployees = new Map<string, string>(); // Map employee ID to database ID

        // PHASE 1: Create all employees without manager relationships
        for (const validRow of validRows) {
          try {
            const { row, rowIndex } = validRow;

            // Create user account
            const now = new Date();
            const inviteExpiresAt = new Date(
              now.getTime() + 24 * 60 * 60 * 1000,
            );

            const user = manager.create(User, {
              email: row.email,
              passwordHash: "",
              role: UserRole.EMPLOYEE,
              isActive: false,
              mustChangePassword: false,
              inviteStatus: "invited",
              invitedAt: now,
              inviteExpiresAt: inviteExpiresAt,
            });
            const savedUser = await manager.save(user);

            // Create employee record without manager relationship initially
            const employee = manager.create(Employee, {
              employeeId: row.employeeId,
              firstName: row.firstName,
              lastName: row.lastName || "",
              email: row.email,
              departmentId: departments.get(row.department),
              position: row.position || "",
              managerId: null, // Set manager in phase 2
              joiningDate: new Date(row.joiningDate),
              userId: savedUser.id,
              // Use consistent policy values for annual allocations (same as manual entry)
              annualLeaveDays: 12, // Standard policy allocation
              sickLeaveDays: 8, // Standard policy allocation
              casualLeaveDays: 8, // Standard policy allocation
              useManualBalances: true, // Mark as existing employee with manual balances
            });

            const savedEmployee = await manager.save(employee);
            createdEmployees.set(row.employeeId, savedEmployee.id);

            // Create leave balances with CSV current balance values
            const currentYear = new Date().getFullYear();

            // Create earned leave balance
            const earnedBalance = manager.create(LeaveBalance, {
              employeeId: savedEmployee.id,
              year: currentYear,
              leaveType: LeaveType.EARNED,
              totalAllocated:
                row.earnedBalance !== undefined ? row.earnedBalance : 0,
              usedDays: 0,
              availableDays:
                row.earnedBalance !== undefined ? row.earnedBalance : 0,
              carryForward: 0,
            });
            await manager.save(earnedBalance);

            // Create sick leave balance
            const sickBalance = manager.create(LeaveBalance, {
              employeeId: savedEmployee.id,
              year: currentYear,
              leaveType: LeaveType.SICK,
              totalAllocated:
                row.sickBalance !== undefined ? row.sickBalance : 0,
              usedDays: 0,
              availableDays:
                row.sickBalance !== undefined ? row.sickBalance : 0,
              carryForward: 0,
            });
            await manager.save(sickBalance);

            // Create casual leave balance
            const casualBalance = manager.create(LeaveBalance, {
              employeeId: savedEmployee.id,
              year: currentYear,
              leaveType: LeaveType.CASUAL,
              totalAllocated:
                row.casualBalance !== undefined ? row.casualBalance : 0,
              usedDays: 0,
              availableDays:
                row.casualBalance !== undefined ? row.casualBalance : 0,
              carryForward: 0,
            });
            await manager.save(casualBalance);

            successfulImports.push({
              row: rowIndex,
              employeeId: row.employeeId,
              firstName: row.firstName,
              lastName: row.lastName || "",
              email: row.email,
              status: "success",
              errors: [],
            });

            console.log(
              `Successfully imported employee: ${row.employeeId} - ${row.email}`,
            );
          } catch (error) {
            console.error(`Error importing row ${validRow.rowIndex}:`, error);
            failedImports.push({
              row: validRow.rowIndex,
              employeeId: validRow.row.employeeId || "N/A",
              email: validRow.row.email || "N/A",
              errors: [`Database error: ${error.message}`],
            });
          }
        }

        // PHASE 2: Update manager relationships for successfully created employees
        // First identify all employees who are managers based on the CSV data
        const managerEmployeeIds = new Set<string>();
        
        // Find all employee IDs that are mentioned as managers
        for (const validRow of validRows) {
          const { row } = validRow;
          if (row.manager) {
            managerEmployeeIds.add(row.manager);
            console.log(`Identified manager in CSV: ${row.manager}`);
          }
        }
        
        // Set to collect database IDs of all managers
        const managerDbIds = new Set<string>();
        
        // Set manager relationships and collect manager database IDs
        for (const validRow of validRows) {
          try {
            const { row } = validRow;
            if (row.manager && createdEmployees.has(row.employeeId)) {
              let managerDbId: string | null = null;

              // Check if manager exists in current CSV batch
              if (createdEmployees.has(row.manager)) {
                managerDbId = createdEmployees.get(row.manager)!;
              }
              // Check if manager exists in existing database
              else if (managers.has(row.manager)) {
                managerDbId = managers.get(row.manager)!;
              }

              if (managerDbId) {
                const employeeDbId = createdEmployees.get(row.employeeId)!;
                await manager.update(Employee, employeeDbId, {
                  managerId: managerDbId,
                });
                
                // Add to list of managers to update
                managerDbIds.add(managerDbId);

                console.log(
                  `Updated manager relationship: ${row.employeeId} -> ${row.manager}`,
                );
              }
            }
            
            // If this employee is identified as a manager in the CSV, ensure they're in the managers set
            if (managerEmployeeIds.has(row.employeeId) && createdEmployees.has(row.employeeId)) {
              const employeeDbId = createdEmployees.get(row.employeeId)!;
              managerDbIds.add(employeeDbId);
              console.log(`Added ${row.employeeId} to managers list because they supervise others`);
            }
          } catch (error) {
            console.error(
              `Error setting manager for ${validRow.row.employeeId}:`,
              error,
            );
            // Don't fail the entire import for manager relationship errors
          }
        }
        
        // PHASE 3: Directly update user roles in the database for all identified managers
        console.log(`Updating roles for ${managerDbIds.size} managers`);
        for (const managerDbId of managerDbIds) {
          try {
            // Find the manager's employee record
            const managerEmployee = await manager.findOne(Employee, {
              where: { id: managerDbId },
              relations: ["user"],
            });
            
            if (!managerEmployee || !managerEmployee.user) {
              console.log(`❌ Manager employee record or user not found for ID: ${managerDbId}`);
              continue;
            }
            
            // Skip if already a manager or admin
            if (managerEmployee.user.role === UserRole.MANAGER || 
                managerEmployee.user.role === UserRole.ADMIN) {
              console.log(`✅ User ${managerEmployee.user.email} is already ${managerEmployee.user.role}`);
              continue;
            }
            
            // Update role to manager
            await manager.update(User, managerEmployee.user.id, {
              role: UserRole.MANAGER,
            });
            
            console.log(`🎉 Set ${managerEmployee.user.email} as manager during bulk import`);
          } catch (error) {
            console.error(`Error setting manager role for ${managerDbId}: ${error.message}`);
          }
        }
      });

      const summary = {
        totalRows: csvData.length,
        successfulImports: successfulImports.length,
        failedImports: failedImports.length,
        errors: failedImports,
      };

      console.log("Bulk import completed:", summary);

      return {
        success: failedImports.length === 0,
        message:
          failedImports.length === 0
            ? `Successfully imported all ${successfulImports.length} employees`
            : `Imported ${successfulImports.length} employees, ${failedImports.length} failed`,
        summary,
      };
    } catch (error) {
      console.error("Bulk import failed:", error);
      return {
        success: false,
        message: `Import failed: ${error.message}`,
        summary: {
          totalRows: 0,
          successfulImports: 0,
          failedImports: 0,
          errors: [],
        },
      };
    }
  }

  /**
   * Generate CSV template for bulk import
   */
  generateCsvTemplate(): string {
    const headers = [
      "Employee ID",
      "First Name",
      "Last Name",
      "Email",
      "Department",
      "Position",
      "Manager",
      "Joining Date",
      "Earned/Privilege Balance",
      "Sick Leave Balance",
      "Casual Leave Balance",
    ];

    const sampleData = [
      "EMP001",
      "John",
      "Doe",
      "john.doe@company.com",
      "Engineering",
      "Software Engineer",
      "",
      "2025-01-15",
      "12",
      "8",
      "6",
    ];

    const instructionsRow = [
      "# Instructions:",
      "# Required fields: Employee ID, First Name, Email, Department, Joining Date",
      "# Department must exist in system (Engineering, HR, Finance, etc.)",
      "# Manager can be Employee ID or email, leave blank if none",
      "# Date format: YYYY-MM-DD",
      "# Leave balances are current available days (not annual allocation)",
      "# Delete this instruction row before uploading",
      "",
      "",
      "",
      "",
    ];

    return [
      headers.join(","),
      instructionsRow.join(","),
      sampleData.join(","),
    ].join("\n");
  }
}
