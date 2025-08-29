import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LeavesService } from "./leaves.service";
import { LeaveRequest } from "./entities/leave-request.entity";
import { LeaveBalance } from "./entities/leave-balance.entity";
import { Employee } from "../employees/entities/employee.entity";
import { User } from "../users/entities/user.entity";
import { Holiday } from "../holidays/entities/holiday.entity";
import { LeaveCalculationService } from "./services/leave-calculation.service";
import { LeaveCleanupService } from "./services/leave-cleanup.service";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([LeaveRequest, LeaveBalance, Employee, User, Holiday]),
    MailModule,
  ],
  providers: [LeavesService, LeaveCalculationService, LeaveCleanupService],
  exports: [LeavesService, LeaveCalculationService, LeaveCleanupService],
})
export class LeavesModule {}
