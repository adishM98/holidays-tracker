import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LeavesService } from "./leaves.service";
import { LeaveRequest } from "./entities/leave-request.entity";
import { LeaveBalance } from "./entities/leave-balance.entity";
import { LeaveBalanceHistory } from "./entities/leave-balance-history.entity";
import { Employee } from "../employees/entities/employee.entity";
import { User } from "../users/entities/user.entity";
import { Holiday } from "../holidays/entities/holiday.entity";
import { LeaveCalculationService } from "./services/leave-calculation.service";
import { LeaveCleanupService } from "./services/leave-cleanup.service";
import { YearEndBalanceService } from "./services/year-end-balance.service";
import { LeaveBalanceSchedulerService } from "./services/leave-balance-scheduler.service";
import { LeaveAutoApproveService } from "./services/leave-auto-approve.service";
import { AdminLeaveBalanceController } from "./admin-leave-balance.controller";
import { MailModule } from "../mail/mail.module";
import { ScheduleModule } from "@nestjs/schedule";
import { SettingsModule } from "../settings/settings.module";
import { GoogleCalendarModule } from "../google-calendar/google-calendar.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeaveRequest,
      LeaveBalance,
      LeaveBalanceHistory,
      Employee,
      User,
      Holiday,
    ]),
    MailModule,
    ScheduleModule.forRoot(),
    SettingsModule,
    forwardRef(() => GoogleCalendarModule),
  ],
  controllers: [AdminLeaveBalanceController],
  providers: [
    LeavesService,
    LeaveCalculationService,
    LeaveCleanupService,
    YearEndBalanceService,
    LeaveBalanceSchedulerService,
    LeaveAutoApproveService,
  ],
  exports: [
    LeavesService, 
    LeaveCalculationService, 
    LeaveCleanupService,
    YearEndBalanceService
  ],
})
export class LeavesModule {}
