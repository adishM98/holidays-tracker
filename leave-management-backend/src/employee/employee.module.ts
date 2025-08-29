import { Module } from "@nestjs/common";
import { EmployeeController } from "./employee.controller";
import { EmployeesModule } from "../employees/employees.module";
import { LeavesModule } from "../leaves/leaves.module";

@Module({
  imports: [EmployeesModule, LeavesModule],
  controllers: [EmployeeController],
})
export class EmployeeModule {}
