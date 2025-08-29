import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from "@nestjs/swagger";
import { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { User } from "../users/entities/user.entity";
import { EmployeesService } from "../employees/employees.service";
import { DepartmentsService } from "../departments/departments.service";
import { LeavesService } from "../leaves/leaves.service";
import { LeaveCleanupService } from "../leaves/services/leave-cleanup.service";
import { BulkImportService } from "./services/bulk-import.service";
import { HolidaysService } from "../holidays/holidays.service";
import { CreateEmployeeDto } from "../employees/dto/create-employee.dto";
import { UpdateEmployeeDto } from "../employees/dto/update-employee.dto";
import { CreateDepartmentDto } from "../departments/dto/create-department.dto";
import { UpdateDepartmentDto } from "../departments/dto/update-department.dto";
import { BulkImportResultDto } from "./dto/bulk-import-result.dto";
import { CreateLeaveRequestDto } from "../leaves/dto/create-leave-request.dto";
import { UpdateLeaveRequestDto } from "../leaves/dto/update-leave-request.dto";
import { ApproveLeaveRequestDto } from "../leaves/dto/approve-leave-request.dto";
import { RejectLeaveRequestDto } from "../leaves/dto/reject-leave-request.dto";
import { CreateHolidayDto } from "../holidays/dto/create-holiday.dto";
import { UpdateHolidayDto } from "../holidays/dto/update-holiday.dto";

@ApiTags("Admin")
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private employeesService: EmployeesService,
    private departmentsService: DepartmentsService,
    private leavesService: LeavesService,
    private leaveCleanupService: LeaveCleanupService,
    private bulkImportService: BulkImportService,
    private holidaysService: HolidaysService,
  ) {}

  // Dashboard Stats
  @Get("dashboard-stats")
  @ApiOperation({ summary: "Get admin dashboard statistics" })
  async getDashboardStats() {
    const [employeeStats, departmentStats, leaveStats, holidayStats] =
      await Promise.all([
        this.employeesService.getEmployeeStats(),
        this.departmentsService.getDepartmentStats(),
        this.leavesService.getLeaveStats(),
        this.holidaysService.getHolidayStats(),
      ]);

    return {
      employees: employeeStats,
      departments: departmentStats,
      leaves: leaveStats,
      holidays: holidayStats,
    };
  }

  // Employee Management
  @Get("employees")
  @ApiOperation({ summary: "Get all employees with filtering and pagination" })
  async getEmployees(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
    @Query("department") departmentId?: string,
  ) {
    return this.employeesService.findAll({
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 10,
      search,
      departmentId,
    });
  }

  @Get("employees/:id")
  @ApiOperation({ summary: "Get employee by ID" })
  async getEmployee(@Param("id") id: string) {
    return this.employeesService.findOne(id);
  }

  @Post("employees")
  @ApiOperation({ summary: "Create new employee" })
  async createEmployee(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Put("employees/:id")
  @ApiOperation({ summary: "Update employee" })
  async updateEmployee(
    @Param("id") id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Delete("employees/:id")
  @ApiOperation({ summary: "Delete employee" })
  async deleteEmployee(@Param("id") id: string) {
    await this.employeesService.remove(id);
    return { message: "Employee deleted successfully" };
  }

  @Post("employees/:id/reset-password")
  @ApiOperation({
    summary: "Reset employee password and generate temporary password",
  })
  async resetEmployeePassword(@Param("id") id: string) {
    return this.employeesService.resetEmployeePassword(id);
  }

  @Put("employees/:id/deactivate")
  @ApiOperation({ summary: "Deactivate employee (off-board)" })
  async deactivateEmployee(@Param("id") id: string) {
    await this.employeesService.deactivateEmployee(id);
    return { message: "Employee deactivated successfully" };
  }

  @Put("employees/:id/activate")
  @ApiOperation({ summary: "Activate employee" })
  async activateEmployee(@Param("id") id: string) {
    await this.employeesService.activateEmployee(id);
    return { message: "Employee activated successfully" };
  }

  @Post("employees/:id/regenerate-invite")
  @ApiOperation({
    summary: "Regenerate invite for employee with expired invite",
  })
  async regenerateInvite(@Param("id") id: string) {
    await this.employeesService.regenerateInvite(id);
    return { message: "Invite regenerated successfully" };
  }

  // Bulk Import
  @Post("employees/bulk-import")
  @ApiOperation({ summary: "Bulk import employees from CSV file" })
  @ApiConsumes("multipart/form-data")
  @ApiResponse({ status: 200, type: BulkImportResultDto })
  @UseInterceptors(FileInterceptor("file"))
  async bulkImportEmployees(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException("CSV file is required");
    }

    const result = await this.bulkImportService.importEmployees(file);

    // Send email report to admin
    if (user.email) {
      try {
        // await this.mailService.sendBulkImportReport(user.email, result);
      } catch (error) {
        console.warn("Failed to send bulk import report email:", error.message);
      }
    }

    return result;
  }

  @Get("employees/import-template")
  @ApiOperation({ summary: "Download CSV import template" })
  async downloadImportTemplate(@Res() res: Response) {
    const template = this.bulkImportService.generateCsvTemplate();

    res.set({
      "Content-Type": "text/csv",
      "Content-Disposition":
        'attachment; filename="employee-import-template.csv"',
    });

    res.send(template);
  }

  // Department Management
  @Get("departments")
  @ApiOperation({ summary: "Get all departments" })
  async getDepartments() {
    return this.departmentsService.findAll();
  }

  @Get("departments/:id")
  @ApiOperation({ summary: "Get department by ID" })
  async getDepartment(@Param("id") id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post("departments")
  @ApiOperation({ summary: "Create new department" })
  async createDepartment(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Put("departments/:id")
  @ApiOperation({ summary: "Update department" })
  async updateDepartment(
    @Param("id") id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(id, updateDepartmentDto);
  }

  @Delete("departments/:id")
  @ApiOperation({ summary: "Delete department" })
  async deleteDepartment(@Param("id") id: string) {
    await this.departmentsService.remove(id);
    return { message: "Department deleted successfully" };
  }

  // Leave Management
  @Get("leave-requests")
  @ApiOperation({ summary: "Get all leave requests with filtering" })
  async getLeaveRequests(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
    @Query("employee") employeeId?: string,
  ) {
    return this.leavesService.findAll({
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 10,
      status: status as any,
      employeeId,
    });
  }

  @Post("leave-requests")
  @ApiOperation({
    summary: "Create leave request for an employee (admin only)",
  })
  async createLeaveRequest(
    @Body() body: CreateLeaveRequestDto & { employeeId: string },
    @CurrentUser() user: User,
  ) {
    const { employeeId, ...createLeaveRequestDto } = body;
    const leaveRequest = await this.leavesService.createLeaveRequest(
      employeeId,
      createLeaveRequestDto,
    );

    // Auto-approve admin-created leaves
    const employee = await this.employeesService.findByUserId(user.id);
    if (employee) {
      await this.leavesService.approveLeaveRequest(
        leaveRequest.id,
        employee.id,
        {
          comments: "Auto-approved by admin",
        },
      );
    }

    return this.leavesService.findOne(leaveRequest.id);
  }

  @Put("leave-requests/:id")
  @ApiOperation({ summary: "Update leave request (admin only)" })
  async updateLeaveRequest(
    @Param("id") id: string,
    @Body() updateLeaveRequestDto: UpdateLeaveRequestDto,
  ) {
    return this.leavesService.updateLeaveRequest(id, updateLeaveRequestDto);
  }

  @Put("leave-requests/:id/approve")
  @ApiOperation({ summary: "Approve leave request (admin only)" })
  async approveLeaveRequest(
    @Param("id") id: string,
    @Body() approveDto: ApproveLeaveRequestDto,
    @CurrentUser() user: User,
  ) {
    // Admin doesn't need employee profile - use user ID directly as approver
    return this.leavesService.approveLeaveRequest(id, user.id, approveDto);
  }

  @Put("leave-requests/:id/reject")
  @ApiOperation({ summary: "Reject leave request (admin only)" })
  async rejectLeaveRequest(
    @Param("id") id: string,
    @Body() rejectDto: RejectLeaveRequestDto,
    @CurrentUser() user: User,
  ) {
    // Admin doesn't need employee profile - use user ID directly as approver
    return this.leavesService.rejectLeaveRequest(id, user.id, rejectDto);
  }

  @Delete("leave-requests/:id")
  @ApiOperation({ summary: "Delete leave request (admin only)" })
  async deleteLeaveRequest(@Param("id") id: string) {
    await this.leavesService.deleteLeaveRequest(id);
    return { message: "Leave request deleted successfully" };
  }

  @Get("leave-calendar")
  @ApiOperation({ summary: "Get leave calendar for all employees" })
  async getLeaveCalendar(
    @Query("month") month?: number,
    @Query("year") year?: number,
    @Query("department") departmentId?: string,
  ) {
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    return this.leavesService.getLeaveCalendar(
      targetMonth,
      targetYear,
      departmentId,
    );
  }

  @Get("reports/leave-summary")
  @ApiOperation({ summary: "Get leave summary report" })
  async getLeaveSummaryReport(
    @Query("year") year?: number,
    @Query("department") departmentId?: string,
  ) {
    const targetYear = year || new Date().getFullYear();

    const [leaveStats, leaveRequests] = await Promise.all([
      this.leavesService.getLeaveStats(targetYear),
      this.leavesService.findAll({
        limit: 1000, // Get more data for reporting
      }),
    ]);

    return {
      year: targetYear,
      stats: leaveStats,
      summary: {
        totalDaysTaken: leaveRequests.requests
          .filter((req) => req.status === "approved")
          .reduce((sum, req) => sum + req.daysCount, 0),
        averageDaysPerEmployee: 0, // Calculate based on your needs
        mostRequestedLeaveType: leaveStats.byType[0]?.type || "N/A",
      },
    };
  }

  @Get("employees/:id/leave-balance")
  @ApiOperation({ summary: "Get leave balance for a specific employee" })
  async getEmployeeLeaveBalance(
    @Param("id") employeeId: string,
    @Query("year") year?: number,
  ) {
    const balances = await this.leavesService.getLeaveBalance(employeeId, year);
    return {
      year: year || new Date().getFullYear(),
      employeeId,
      balances,
    };
  }

  @Get("reports/employee-leave-balance")
  @ApiOperation({ summary: "Get employee leave balances report" })
  async getEmployeeLeaveBalances(
    @Query("year") year?: number,
    @Query("department") departmentId?: string,
  ) {
    const employees = await this.employeesService.findAll({
      departmentId,
      limit: 1000,
    });

    const balancesPromises = employees.employees.map(async (employee) => {
      const balances = await this.leavesService.getLeaveBalance(
        employee.id,
        year,
      );
      return {
        employee: {
          id: employee.id,
          name: employee.fullName,
          employeeId: employee.employeeId,
          department: employee.department?.name,
        },
        balances,
      };
    });

    const employeeBalances = await Promise.all(balancesPromises);

    return {
      year: year || new Date().getFullYear(),
      employees: employeeBalances,
    };
  }

  // Holiday Management
  @Get("holidays")
  @ApiOperation({ summary: "Get all holidays" })
  async getHolidays(
    @Query("year") year?: number,
    @Query("isActive") isActive?: boolean,
  ) {
    return this.holidaysService.findAll({
      year: year ? parseInt(year.toString()) : undefined,
      isActive: isActive !== undefined ? isActive === true : undefined,
    });
  }

  @Get("holidays/:id")
  @ApiOperation({ summary: "Get holiday by ID" })
  async getHoliday(@Param("id") id: string) {
    return this.holidaysService.findOne(id);
  }

  @Post("holidays")
  @ApiOperation({ summary: "Create new holiday" })
  async createHoliday(@Body() createHolidayDto: CreateHolidayDto) {
    return this.holidaysService.create(createHolidayDto);
  }

  @Put("holidays/:id")
  @ApiOperation({ summary: "Update holiday" })
  async updateHoliday(
    @Param("id") id: string,
    @Body() updateHolidayDto: UpdateHolidayDto,
  ) {
    return this.holidaysService.update(id, updateHolidayDto);
  }

  @Delete("holidays/:id")
  @ApiOperation({ summary: "Delete holiday" })
  async deleteHoliday(@Param("id") id: string) {
    await this.holidaysService.remove(id);
    return { message: "Holiday deleted successfully" };
  }

  @Get("holidays/upcoming/:days")
  @ApiOperation({ summary: "Get upcoming holidays" })
  async getUpcomingHolidays(@Param("days") days: string) {
    return this.holidaysService.getUpcomingHolidays(parseInt(days));
  }

  // Leave Cleanup Management
  @Get("cleanup/stats")
  @ApiOperation({
    summary: "Get cleanup statistics for cancelled leave requests",
  })
  async getCleanupStats() {
    return this.leaveCleanupService.getCleanupStats();
  }

  @Post("cleanup/manual")
  @ApiOperation({
    summary: "Manually trigger cleanup of old cancelled leave requests",
  })
  @ApiResponse({ status: 200, description: "Cleanup completed successfully" })
  async manualCleanup() {
    const result = await this.leaveCleanupService.manualCleanup();

    return {
      message: `Successfully cleaned up ${result.deletedCount} cancelled leave requests`,
      deletedCount: result.deletedCount,
      deletedRequests: result.deletedRequests,
    };
  }
}
