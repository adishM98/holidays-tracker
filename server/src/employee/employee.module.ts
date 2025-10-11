import { Module } from "@nestjs/common";
import { EmployeeController } from "./employee.controller";
import { EmployeesModule } from "../employees/employees.module";
import { LeavesModule } from "../leaves/leaves.module";
import { HolidaysModule } from "../holidays/holidays.module";

@Module({
  imports: [EmployeesModule, LeavesModule, HolidaysModule],
  controllers: [EmployeeController],
})
export class EmployeeModule {}
