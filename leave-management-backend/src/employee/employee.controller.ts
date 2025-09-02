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
  ForbiddenException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { EmployeesService } from "../employees/employees.service";
import { LeavesService } from "../leaves/leaves.service";
import { HolidaysService } from "../holidays/holidays.service";
import { CreateLeaveRequestDto } from "../leaves/dto/create-leave-request.dto";
import { UpdateEmployeeDto } from "../employees/dto/update-employee.dto";

@ApiTags("Employee")
@Controller("employee")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmployeeController {
  constructor(
    private employeesService: EmployeesService,
    private leavesService: LeavesService,
    private holidaysService: HolidaysService,
  ) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Get employee dashboard data" })
  async getDashboard(@CurrentUser() user: User) {
    const employee = await this.employeesService.findByUserId(user.id);
    if (!employee) {
      throw new ForbiddenException("Employee profile not found");
    }

    const currentYear = new Date().getFullYear();

    // Get leave balances
    const leaveBalances = await this.leavesService.getLeaveBalance(
      employee.id,
      currentYear,
    );

    // Get recent leave requests
    const recentRequests = await this.leavesService.findAll({
      employeeId: employee.id,
      limit: 5,
    });

    // Get pending requests count
    const pendingRequests = await this.leavesService.findAll({
      employeeId: employee.id,
      status: "pending" as any,
      limit: 100,
    });

    return {
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        position: employee.position,
        department: employee.department?.name,
        joiningDate: employee.joiningDate,
        manager: employee.manager
          ? {
              id: employee.manager.id,
              name: employee.manager.fullName,
            }
          : null,
      },
      leaveBalances,
      stats: {
        pendingRequests: pendingRequests.total,
        totalRequests: recentRequests.total,
        approvedThisYear: recentRequests.requests.filter(
          (req) =>
            req.status === "approved" &&
            new Date(req.startDate).getFullYear() === currentYear,
        ).length,
      },
      recentRequests: recentRequests.requests,
    };
  }

  @Get("profile")
  @ApiOperation({ summary: "Get employee profile" })
  async getProfile(@CurrentUser() user: User) {
    const employee = await this.employeesService.findByUserId(user.id);
    if (!employee) {
      throw new ForbiddenException("Employee profile not found");
    }

    return {
      employee,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  @Put("profile")
  @ApiOperation({ summary: "Update employee profile" })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    const employee = await this.employeesService.findByUserId(user.id);
    if (!employee) {
      throw new ForbiddenException("Employee profile not found");
    }

    // Employees can only update certain fields
    const allowedFields = {
      phone: updateEmployeeDto.phone,
    };

    // Remove undefined fields
    const fieldsToUpdate = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined),
    );

    return this.employeesService.update(employee.id, fieldsToUpdate);
  }

  @Get("leave-balance")
  @ApiOperation({ summary: "Get employee leave balances" })
  async getLeaveBalance(
    @CurrentUser() user: User,
    @Query("year") year?: number,
  ) {
    const employee = await this.employeesService.findByUserId(user.id);
    if (!employee) {
      throw new ForbiddenException("Employee profile not found");
    }

    const targetYear = year || new Date().getFullYear();
    const balances = await this.leavesService.getLeaveBalance(
      employee.id,
      targetYear,
    );

    return {
      year: targetYear,
      employee: {
        id: employee.id,
        name: employee.fullName,
        employeeId: employee.employeeId,
      },
      balances,
    };
  }

  @Get("leave-requests")
  @ApiOperation({ summary: "Get employee leave requests" })
  async getLeaveRequests(
    @CurrentUser() user: User,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
  ) {
    const employee = await this.employeesService.findByUserId(user.id);
    if (!employee) {
      throw new ForbiddenException("Employee profile not found");
    }

    return this.leavesService.findAll({
      employeeId: employee.id,
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 10,
      status: status as any,
    });
  }

  @Get("leave-requests/:id")
  @ApiOperation({ summary: "Get specific leave request" })
  async getLeaveRequest(
    @CurrentUser() user: User,
    @Param("id") requestId: string,
  ) {
    const employee = await this.employeesService.findByUserId(user.id);
    if (!employee) {
      throw new ForbiddenException("Employee profile not found");
    }

    const leaveRequest = await this.leavesService.findOne(requestId);

    // Verify the request belongs to the current user
    if (leaveRequest.employeeId !== employee.id) {
      throw new ForbiddenException("You can only view your own leave requests");
    }

    return leaveRequest;
  }

  @Post("leave-requests")
  @ApiOperation({ summary: "Create a new leave request" })
  @ApiResponse({
    status: 201,
    description: "Leave request created successfully",
  })
  async createLeaveRequest(
    @CurrentUser() user: User,
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
  ) {
    const employee = await this.employeesService.findByUserId(user.id);
    if (!employee) {
      throw new ForbiddenException("Employee profile not found");
    }

    return this.leavesService.createLeaveRequest(
      employee.id,
      createLeaveRequestDto,
    );
  }

  @Put("leave-requests/:id/cancel")
  @ApiOperation({ summary: "Cancel a leave request" })
  @ApiResponse({
    status: 200,
    description: "Leave request cancelled successfully",
  })
  async cancelLeaveRequest(
    @CurrentUser() user: User,
    @Param("id") requestId: string,
  ) {
    const employee = await this.employeesService.findByUserId(user.id);
    if (!employee) {
      throw new ForbiddenException("Employee profile not found");
    }

    return this.leavesService.cancelLeaveRequest(requestId, employee.id);
  }

  @Get("leave-calendar")
  @ApiOperation({ summary: "Get leave calendar for employee" })
  async getLeaveCalendar(
    @CurrentUser() user: User,
    @Query("month") month?: number,
    @Query("year") year?: number,
  ) {
    const employee = await this.employeesService.findByUserId(user.id);
    if (!employee) {
      throw new ForbiddenException("Employee profile not found");
    }

    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    // Get employee's own approved leaves
    const employeeLeaves = await this.leavesService.findAll({
      employeeId: employee.id,
      status: "approved" as any,
      limit: 100,
    });

    // Filter leaves for the specified month
    const monthLeaves = employeeLeaves.requests.filter((leave) => {
      const leaveMonth = new Date(leave.startDate).getMonth() + 1;
      const leaveYear = new Date(leave.startDate).getFullYear();
      return leaveMonth === targetMonth && leaveYear === targetYear;
    });

    // Optionally get department/team calendar if needed
    let teamCalendar = [];
    if (employee.departmentId) {
      teamCalendar = await this.leavesService.getLeaveCalendar(
        targetMonth,
        targetYear,
        employee.departmentId,
      );
      // Remove own leaves from team calendar to avoid duplicates
      teamCalendar = teamCalendar.filter(
        (leave) => leave.employeeId !== employee.id,
      );
    }

    return {
      month: targetMonth,
      year: targetYear,
      employee: {
        id: employee.id,
        name: employee.fullName,
      },
      employeeLeaves: monthLeaves,
      teamLeaves: teamCalendar,
    };
  }

  @Get("leave-history")
  @ApiOperation({ summary: "Get employee leave history" })
  async getLeaveHistory(
    @CurrentUser() user: User,
    @Query("year") year?: number,
    @Query("type") leaveType?: string,
  ) {
    const employee = await this.employeesService.findByUserId(user.id);
    if (!employee) {
      throw new ForbiddenException("Employee profile not found");
    }

    const targetYear = year || new Date().getFullYear();

    // Get all requests for the year
    const allRequests = await this.leavesService.findAll({
      employeeId: employee.id,
      limit: 1000,
    });

    // Filter by year and optionally by leave type
    const filteredRequests = allRequests.requests.filter((request) => {
      const requestYear = new Date(request.startDate).getFullYear();
      const matchesYear = requestYear === targetYear;
      const matchesType = leaveType ? request.leaveType === leaveType : true;
      return matchesYear && matchesType;
    });

    // Calculate totals
    const summary = {
      totalRequests: filteredRequests.length,
      approvedRequests: filteredRequests.filter(
        (req) => req.status === "approved",
      ).length,
      rejectedRequests: filteredRequests.filter(
        (req) => req.status === "rejected",
      ).length,
      pendingRequests: filteredRequests.filter(
        (req) => req.status === "pending",
      ).length,
      cancelledRequests: filteredRequests.filter(
        (req) => req.status === "cancelled",
      ).length,
      totalDaysTaken: filteredRequests
        .filter((req) => req.status === "approved")
        .reduce((sum, req) => sum + req.daysCount, 0),
    };

    return {
      year: targetYear,
      leaveType,
      employee: {
        id: employee.id,
        name: employee.fullName,
        employeeId: employee.employeeId,
      },
      summary,
      requests: filteredRequests,
    };
  }

  @Get("holidays")
  @ApiOperation({ summary: "Get active holidays for employees" })
  async getHolidays(
    @Query("year") year?: number,
    @Query("isActive") isActive?: string,
  ) {
    const targetYear = year || new Date().getFullYear();
    const activeOnly = isActive !== undefined ? isActive === "true" : true;

    const holidays = await this.holidaysService.findAll({
      year: targetYear,
      isActive: activeOnly,
    });

    return {
      year: targetYear,
      holidays,
    };
  }
}
