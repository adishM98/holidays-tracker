import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Employee } from "../../employees/entities/employee.entity";
import { LeaveType } from "../../common/enums/leave-type.enum";
import { User } from "../../users/entities/user.entity";

@Entity("leave_balances_history")
export class LeaveBalanceHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "employee_id" })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: "CASCADE" })
  @JoinColumn({ name: "employee_id" })
  employee: Employee;

  @Column()
  year: number;

  @Column({
    name: "leave_type",
    type: "enum",
    enum: LeaveType,
  })
  leaveType: LeaveType;

  @Column({
    name: "total_allocated",
    type: "decimal",
    precision: 5,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  totalAllocated: number;

  @Column({
    name: "used_days",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  usedDays: number;

  @Column({
    name: "available_days",
    type: "decimal",
    precision: 5,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  availableDays: number;

  @Column({
    name: "carry_forward",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  carryForward: number;
  
  @Column({ name: "archived_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  archivedAt: Date;
  
  @Column({ name: "archived_by", nullable: true })
  archivedById: string | null;
  
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "archived_by" })
  archivedBy: User | null;
}
