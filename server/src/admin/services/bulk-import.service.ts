import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import * as csvParser from "csv-parser";
import { Readable } from "stream";
import { User } from "../../users/entities/user.entity";
import { Employee } from "../../employees/entities/employee.entity";
import { Department } from "../../departments/entities/department.entity";
import { UsersService } from "../../users/users.service";
import { EmployeesService } from "../../employees/employees.service";
import { DepartmentsService } from "../../departments/departments.service";
import { AuthService } from "../../auth/auth.service";
import { MailService } from "../../mail/mail.service";
import { UserRole } from "../../common/enums/user-role.enum";
import { BulkImportResultDto } from "../dto/bulk-import-result.dto";

interface EmployeeRow {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department: string;
  position?: string;
  manager_email?: string;
  joining_date: string;
  annual_leave_days?: string;
  sick_leave_days?: string;
  casual_leave_days?: string;
  probation_months?: string;
}

@Injectable()
export class BulkImportService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    private usersService: UsersService,
    private employeesService: EmployeesService,
    private departmentsService: DepartmentsService,
    private authService: AuthService,
    private mailService: MailService,
  ) {}

  async importEmployees(
    file: Express.Multer.File,
  ): Promise<BulkImportResultDto> {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    if (file.mimetype !== "text/csv") {
      throw new BadRequestException("Only CSV files are allowed");
    }

    const csvData = await this.parseCsv(file.buffer);
    const result: BulkImportResultDto = {
      total: csvData.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // Account for header row

      try {
        await this.processEmployeeRow(row, rowNumber);
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          data: row,
          error: error.message,
        });
      }
    }

    return result;
  }

  private async processEmployeeRow(
    row: EmployeeRow,
    rowNumber: number,
  ): Promise<void> {
    // Validate required fields
    const validationErrors = await this.validateEmployeeRow(row);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(", "));
    }

    // Get or create department
    let department = await this.departmentsService.findByName(row.department);
    if (!department) {
      department = await this.departmentsService.create({
        name: row.department,
      });
    }

    // Find manager if specified
    let managerId: string | undefined;
    if (row.manager_email) {
      const managerUser = await this.usersService.findByEmail(
        row.manager_email,
      );
      if (managerUser?.employee) {
        managerId = managerUser.employee.id;
      }
    }

    // Generate secure password
    const password = this.authService.generateSecurePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user account
    const user = await this.usersService.create({
      email: row.email,
      passwordHash: hashedPassword,
      role: UserRole.EMPLOYEE,
      isActive: true,
      mustChangePassword: true,
    });

    // Calculate probation end date
    let probationEndDate: Date | undefined;
    if (row.probation_months) {
      const probationMonths = parseInt(row.probation_months);
      const joiningDate = new Date(row.joining_date);
      probationEndDate = new Date(joiningDate);
      probationEndDate.setMonth(probationEndDate.getMonth() + probationMonths);
    }

    // Create employee record
    const employee = await this.employeesService.create({
      userId: user.id,
      employeeId: row.employee_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      departmentId: department.id,
      position: row.position,
      managerId,
      joiningDate: row.joining_date,
      probationEndDate: probationEndDate?.toISOString().split("T")[0],
      annualLeaveDays: parseInt(row.annual_leave_days) || 21,
      sickLeaveDays: parseInt(row.sick_leave_days) || 10,
      casualLeaveDays: parseInt(row.casual_leave_days) || 6,
    });

    // Send welcome email with temporary password
    try {
      await this.mailService.sendWelcomeEmail(row.email, password);
    } catch (emailError) {
      // Log email error but don't fail the import
      console.warn(
        `Failed to send welcome email to ${row.email}:`,
        emailError.message,
      );
    }
  }

  private async validateEmployeeRow(row: EmployeeRow): Promise<string[]> {
    const errors: string[] = [];

    // Required field validation
    if (!row.employee_id) errors.push("Employee ID is required");
    if (!row.first_name) errors.push("First name is required");
    if (!row.last_name) errors.push("Last name is required");
    if (!row.email || !this.isValidEmail(row.email)) {
      errors.push("Valid email is required");
    }
    if (!row.department) errors.push("Department is required");
    if (!row.joining_date || !this.isValidDate(row.joining_date)) {
      errors.push("Valid joining date is required (YYYY-MM-DD)");
    }

    // Check for duplicates only if basic validation passes
    if (row.employee_id) {
      const existingEmployee = await this.employeesService.findByEmployeeId(
        row.employee_id,
      );
      if (existingEmployee) {
        errors.push("Employee ID already exists");
      }
    }

    if (row.email && this.isValidEmail(row.email)) {
      const existingUser = await this.usersService.findByEmail(row.email);
      if (existingUser) {
        errors.push("Email already exists");
      }
    }

    // Validate manager email if provided
    if (row.manager_email && !this.isValidEmail(row.manager_email)) {
      errors.push("Invalid manager email format");
    }

    // Validate numeric fields
    if (row.annual_leave_days && !this.isValidNumber(row.annual_leave_days)) {
      errors.push("Annual leave days must be a valid number");
    }
    if (row.sick_leave_days && !this.isValidNumber(row.sick_leave_days)) {
      errors.push("Sick leave days must be a valid number");
    }
    if (row.casual_leave_days && !this.isValidNumber(row.casual_leave_days)) {
      errors.push("Casual leave days must be a valid number");
    }
    if (row.probation_months && !this.isValidNumber(row.probation_months)) {
      errors.push("Probation months must be a valid number");
    }

    return errors;
  }

  private async parseCsv(buffer: Buffer): Promise<EmployeeRow[]> {
    return new Promise((resolve, reject) => {
      const results: EmployeeRow[] = [];
      const stream = Readable.from(buffer);

      stream
        .pipe(csvParser())
        .on("data", (data) => results.push(data))
        .on("end", () => resolve(results))
        .on("error", reject);
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(dateString);
  }

  private isValidNumber(value: string): boolean {
    const num = parseInt(value);
    return !isNaN(num) && num >= 0;
  }

  generateCsvTemplate(): string {
    return `employee_id,first_name,last_name,email,phone,department,position,manager_email,joining_date,annual_leave_days,sick_leave_days,casual_leave_days,probation_months
EMP001,John,Doe,john.doe@company.com,+1234567890,IT,Software Engineer,jane.smith@company.com,2023-01-15,21,10,6,3
EMP002,Jane,Smith,jane.smith@company.com,+1234567891,IT,Tech Lead,,2022-03-01,25,12,8,0
EMP003,Mike,Johnson,mike.johnson@company.com,+1234567892,HR,HR Manager,,2021-06-10,23,10,7,0`;
  }
}
