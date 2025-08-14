import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { LeaveStatus } from '../common/enums/leave-status.enum';
import { User } from '../users/entities/user.entity';
import { EmployeesService } from '../employees/employees.service';
import { LeavesService } from '../leaves/leaves.service';
import { ApproveLeaveRequestDto } from '../leaves/dto/approve-leave-request.dto';
import { RejectLeaveRequestDto } from '../leaves/dto/reject-leave-request.dto';

@ApiTags('Manager')
@Controller('manager')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER, UserRole.ADMIN)
@ApiBearerAuth()
export class ManagerController {
  constructor(
    private employeesService: EmployeesService,
    private leavesService: LeavesService,
  ) {}

  @Get('dashboard-stats')
  @ApiOperation({ summary: 'Get manager dashboard statistics' })
  async getDashboardStats(@CurrentUser() user: User) {
    const manager = await this.employeesService.findByUserId(user.id);
    if (!manager) {
      throw new ForbiddenException('Manager profile not found');
    }

    // Get team members
    const teamMembers = await this.employeesService.findSubordinates(manager.id);
    
    // Get pending requests from team
    const pendingRequests = await this.leavesService.findAll({
      status: LeaveStatus.PENDING,
      managerId: manager.id,
      limit: 100,
    });

    // Get team leave stats for current year
    const currentYear = new Date().getFullYear();
    const teamLeaveStats = await this.leavesService.getLeaveStats(currentYear);

    return {
      teamSize: teamMembers.length,
      pendingRequests: pendingRequests.total,
      activeTeamMembers: teamMembers.filter(member => member.user?.isActive).length,
      leaveStats: teamLeaveStats,
    };
  }

  @Get('team-members')
  @ApiOperation({ summary: 'Get team members under this manager' })
  async getTeamMembers(@CurrentUser() user: User) {
    const manager = await this.employeesService.findByUserId(user.id);
    if (!manager) {
      throw new ForbiddenException('Manager profile not found');
    }

    const teamMembers = await this.employeesService.findSubordinates(manager.id);
    
    // Get leave balances for each team member
    const teamMembersWithBalances = await Promise.all(
      teamMembers.map(async (member) => {
        const balances = await this.leavesService.getLeaveBalance(member.id);
        return {
          ...member,
          leaveBalances: balances,
        };
      })
    );

    return teamMembersWithBalances;
  }

  @Get('team-requests')
  @ApiOperation({ summary: 'Get leave requests from team members' })
  async getTeamRequests(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: LeaveStatus,
    @Query('employee') employeeId?: string,
  ) {
    const manager = await this.employeesService.findByUserId(user.id);
    if (!manager) {
      throw new ForbiddenException('Manager profile not found');
    }

    return this.leavesService.findAll({
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 10,
      status,
      managerId: manager.id,
      employeeId,
    });
  }

  @Get('leave-requests/:id')
  @ApiOperation({ summary: 'Get specific leave request details' })
  async getLeaveRequest(
    @CurrentUser() user: User,
    @Param('id') requestId: string,
  ) {
    const manager = await this.employeesService.findByUserId(user.id);
    if (!manager) {
      throw new ForbiddenException('Manager profile not found');
    }

    const leaveRequest = await this.leavesService.findOne(requestId);
    
    // Verify the request is from a team member
    if (leaveRequest.employee.managerId !== manager.id) {
      throw new ForbiddenException('You can only view requests from your team members');
    }

    return leaveRequest;
  }

  @Put('leave-requests/:id/approve')
  @ApiOperation({ summary: 'Approve a leave request' })
  @ApiResponse({ status: 200, description: 'Leave request approved successfully' })
  async approveLeaveRequest(
    @CurrentUser() user: User,
    @Param('id') requestId: string,
    @Body() approveDto: ApproveLeaveRequestDto,
  ) {
    const manager = await this.employeesService.findByUserId(user.id);
    if (!manager) {
      throw new ForbiddenException('Manager profile not found');
    }

    const leaveRequest = await this.leavesService.findOne(requestId);
    
    // Verify the request is from a team member
    if (leaveRequest.employee.managerId !== manager.id) {
      throw new ForbiddenException('You can only approve requests from your team members');
    }

    return this.leavesService.approveLeaveRequest(requestId, manager.id, approveDto);
  }

  @Put('leave-requests/:id/reject')
  @ApiOperation({ summary: 'Reject a leave request' })
  @ApiResponse({ status: 200, description: 'Leave request rejected successfully' })
  async rejectLeaveRequest(
    @CurrentUser() user: User,
    @Param('id') requestId: string,
    @Body() rejectDto: RejectLeaveRequestDto,
  ) {
    const manager = await this.employeesService.findByUserId(user.id);
    if (!manager) {
      throw new ForbiddenException('Manager profile not found');
    }

    const leaveRequest = await this.leavesService.findOne(requestId);
    
    // Verify the request is from a team member
    if (leaveRequest.employee.managerId !== manager.id) {
      throw new ForbiddenException('You can only reject requests from your team members');
    }

    return this.leavesService.rejectLeaveRequest(requestId, manager.id, rejectDto);
  }

  @Get('team-calendar')
  @ApiOperation({ summary: 'Get team leave calendar for a specific month' })
  async getTeamCalendar(
    @CurrentUser() user: User,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    const manager = await this.employeesService.findByUserId(user.id);
    if (!manager) {
      throw new ForbiddenException('Manager profile not found');
    }

    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    // Get all approved leaves for the team in the specified month
    const teamCalendar = await this.leavesService.getLeaveCalendar(
      targetMonth,
      targetYear,
      manager.departmentId,
    );

    // Filter to only show team members
    const teamMembers = await this.employeesService.findSubordinates(manager.id);
    const teamMemberIds = teamMembers.map(member => member.id);
    
    const teamLeaves = teamCalendar.filter(leave => 
      teamMemberIds.includes(leave.employeeId)
    );

    return {
      month: targetMonth,
      year: targetYear,
      leaves: teamLeaves,
      teamMembers: teamMembers.map(member => ({
        id: member.id,
        name: member.fullName,
        employeeId: member.employeeId,
        position: member.position,
      })),
    };
  }

  @Get('reports/team-leave-summary')
  @ApiOperation({ summary: 'Get leave summary report for team' })
  async getTeamLeaveSummary(
    @CurrentUser() user: User,
    @Query('year') year?: number,
  ) {
    const manager = await this.employeesService.findByUserId(user.id);
    if (!manager) {
      throw new ForbiddenException('Manager profile not found');
    }

    const targetYear = year || new Date().getFullYear();
    const teamMembers = await this.employeesService.findSubordinates(manager.id);

    // Get leave requests for all team members
    const teamLeaveRequests = await Promise.all(
      teamMembers.map(async (member) => {
        const requests = await this.leavesService.findAll({
          employeeId: member.id,
          limit: 100,
        });
        
        const balances = await this.leavesService.getLeaveBalance(member.id, targetYear);
        
        return {
          employee: {
            id: member.id,
            name: member.fullName,
            employeeId: member.employeeId,
            position: member.position,
          },
          totalRequests: requests.total,
          approvedRequests: requests.requests.filter(req => req.status === LeaveStatus.APPROVED).length,
          pendingRequests: requests.requests.filter(req => req.status === LeaveStatus.PENDING).length,
          rejectedRequests: requests.requests.filter(req => req.status === LeaveStatus.REJECTED).length,
          totalDaysTaken: requests.requests
            .filter(req => req.status === LeaveStatus.APPROVED)
            .reduce((sum, req) => sum + req.daysCount, 0),
          leaveBalances: balances,
        };
      })
    );

    return {
      year: targetYear,
      department: manager.department?.name,
      teamSize: teamMembers.length,
      teamSummary: teamLeaveRequests,
      overallStats: {
        totalRequestsPending: teamLeaveRequests.reduce((sum, member) => sum + member.pendingRequests, 0),
        totalDaysTaken: teamLeaveRequests.reduce((sum, member) => sum + member.totalDaysTaken, 0),
        averageDaysPerEmployee: teamLeaveRequests.length > 0 
          ? Math.round((teamLeaveRequests.reduce((sum, member) => sum + member.totalDaysTaken, 0) / teamLeaveRequests.length) * 100) / 100
          : 0,
      },
    };
  }
}