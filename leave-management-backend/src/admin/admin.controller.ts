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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { EmployeesService } from '../employees/employees.service';
import { DepartmentsService } from '../departments/departments.service';
import { LeavesService } from '../leaves/leaves.service';
import { BulkImportService } from './services/bulk-import.service';
import { CreateEmployeeDto } from '../employees/dto/create-employee.dto';
import { UpdateEmployeeDto } from '../employees/dto/update-employee.dto';
import { CreateDepartmentDto } from '../departments/dto/create-department.dto';
import { UpdateDepartmentDto } from '../departments/dto/update-department.dto';
import { BulkImportResultDto } from './dto/bulk-import-result.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private employeesService: EmployeesService,
    private departmentsService: DepartmentsService,
    private leavesService: LeavesService,
    private bulkImportService: BulkImportService,
  ) {}

  // Dashboard Stats
  @Get('dashboard-stats')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  async getDashboardStats() {
    const [employeeStats, departmentStats, leaveStats] = await Promise.all([
      this.employeesService.getEmployeeStats(),
      this.departmentsService.getDepartmentStats(),
      this.leavesService.getLeaveStats(),
    ]);

    return {
      employees: employeeStats,
      departments: departmentStats,
      leaves: leaveStats,
    };
  }

  // Employee Management
  @Get('employees')
  @ApiOperation({ summary: 'Get all employees with filtering and pagination' })
  async getEmployees(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('department') departmentId?: string,
  ) {
    return this.employeesService.findAll({
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 10,
      search,
      departmentId,
    });
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Get employee by ID' })
  async getEmployee(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Post('employees')
  @ApiOperation({ summary: 'Create new employee' })
  async createEmployee(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Put('employees/:id')
  @ApiOperation({ summary: 'Update employee' })
  async updateEmployee(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Delete('employees/:id')
  @ApiOperation({ summary: 'Delete employee' })
  async deleteEmployee(@Param('id') id: string) {
    await this.employeesService.remove(id);
    return { message: 'Employee deleted successfully' };
  }

  // Bulk Import
  @Post('employees/bulk-import')
  @ApiOperation({ summary: 'Bulk import employees from CSV file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, type: BulkImportResultDto })
  @UseInterceptors(FileInterceptor('file'))
  async bulkImportEmployees(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    const result = await this.bulkImportService.importEmployees(file);
    
    // Send email report to admin
    if (user.email) {
      try {
        // await this.mailService.sendBulkImportReport(user.email, result);
      } catch (error) {
        console.warn('Failed to send bulk import report email:', error.message);
      }
    }

    return result;
  }

  @Get('employees/import-template')
  @ApiOperation({ summary: 'Download CSV import template' })
  async downloadImportTemplate(@Res() res: Response) {
    const template = this.bulkImportService.generateCsvTemplate();
    
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="employee-import-template.csv"',
    });
    
    res.send(template);
  }

  // Department Management
  @Get('departments')
  @ApiOperation({ summary: 'Get all departments' })
  async getDepartments() {
    return this.departmentsService.findAll();
  }

  @Get('departments/:id')
  @ApiOperation({ summary: 'Get department by ID' })
  async getDepartment(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post('departments')
  @ApiOperation({ summary: 'Create new department' })
  async createDepartment(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Put('departments/:id')
  @ApiOperation({ summary: 'Update department' })
  async updateDepartment(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(id, updateDepartmentDto);
  }

  @Delete('departments/:id')
  @ApiOperation({ summary: 'Delete department' })
  async deleteDepartment(@Param('id') id: string) {
    await this.departmentsService.remove(id);
    return { message: 'Department deleted successfully' };
  }

  // Leave Management
  @Get('leave-requests')
  @ApiOperation({ summary: 'Get all leave requests with filtering' })
  async getLeaveRequests(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('employee') employeeId?: string,
  ) {
    return this.leavesService.findAll({
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 10,
      status: status as any,
      employeeId,
    });
  }

  @Get('reports/leave-summary')
  @ApiOperation({ summary: 'Get leave summary report' })
  async getLeaveSummaryReport(
    @Query('year') year?: number,
    @Query('department') departmentId?: string,
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
          .filter(req => req.status === 'approved')
          .reduce((sum, req) => sum + req.daysCount, 0),
        averageDaysPerEmployee: 0, // Calculate based on your needs
        mostRequestedLeaveType: leaveStats.byType[0]?.type || 'N/A',
      },
    };
  }

  @Get('reports/employee-leave-balance')
  @ApiOperation({ summary: 'Get employee leave balances report' })
  async getEmployeeLeaveBalances(
    @Query('year') year?: number,
    @Query('department') departmentId?: string,
  ) {
    const employees = await this.employeesService.findAll({
      departmentId,
      limit: 1000,
    });

    const balancesPromises = employees.employees.map(async (employee) => {
      const balances = await this.leavesService.getLeaveBalance(employee.id, year);
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
}