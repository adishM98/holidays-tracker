import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmployeesService } from "./employees.service";
import { Employee } from "./entities/employee.entity";
import { User } from "../users/entities/user.entity";
import { LeaveBalance } from "../leaves/entities/leave-balance.entity";
import { LeaveCalculationService } from "../leaves/services/leave-calculation.service";

@Module({
  imports: [TypeOrmModule.forFeature([Employee, User, LeaveBalance])],
  providers: [EmployeesService, LeaveCalculationService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
