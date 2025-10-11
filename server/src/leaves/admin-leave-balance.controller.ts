import {
  Controller,
  Post,
  UseGuards,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { YearEndBalanceService } from "./services/year-end-balance.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";

@Controller("admin/leave-balances")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminLeaveBalanceController {
  constructor(private yearEndBalanceService: YearEndBalanceService) {}

  @Post("year-end-reset")
  @HttpCode(HttpStatus.OK)
  async triggerYearEndReset(
    @Body() body: { notifyEmployees?: boolean }
  ) {
    try {
      const notifyEmployees = body.notifyEmployees || false;
      const result = await this.yearEndBalanceService.processYearEndReset(notifyEmployees);
      return {
        success: true,
        message: "Year-end reset process completed successfully",
        ...result,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to process year-end reset: ${error.message}`
      );
    }
  }

  @Post("reset/:employeeId")
  @HttpCode(HttpStatus.OK)
  async resetEmployeeBalance(
    @Param("employeeId") employeeId: string,
    @Body() body: { targetYear: number; notifyEmployee?: boolean },
    @CurrentUser() currentUser: User
  ) {
    if (!body.targetYear) {
      throw new BadRequestException("Target year is required");
    }

    try {
      const result = await this.yearEndBalanceService.resetLeaveBalancesForEmployee(
        employeeId,
        body.targetYear,
        currentUser.id,
        body.notifyEmployee || false
      );

      return {
        success: true,
        message: `Leave balances for employee ${employeeId} reset successfully for year ${body.targetYear}`,
        ...result,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to reset employee leave balances: ${error.message}`
      );
    }
  }
}
