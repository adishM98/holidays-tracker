import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmployeesService } from "./employees.service";
import { Employee } from "./entities/employee.entity";
import { User } from "../users/entities/user.entity";
import { Department } from "../departments/entities/department.entity";
import { LeaveBalance } from "../leaves/entities/leave-balance.entity";
import { Holiday } from "../holidays/entities/holiday.entity";
import { LeaveCalculationService } from "../leaves/services/leave-calculation.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      User,
      Department,
      LeaveBalance,
      Holiday,
    ]),
  ],
  providers: [EmployeesService, LeaveCalculationService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
