import { Module } from "@nestjs/common";
import { ManagerController } from "./manager.controller";
import { EmployeesModule } from "../employees/employees.module";
import { LeavesModule } from "../leaves/leaves.module";

@Module({
  imports: [EmployeesModule, LeavesModule],
  controllers: [ManagerController],
})
export class ManagerModule {}
