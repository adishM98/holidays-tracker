import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Employee } from "../../employees/entities/employee.entity";
import { LeaveType } from "../../common/enums/leave-type.enum";
import { LeaveStatus } from "../../common/enums/leave-status.enum";

@Entity("leave_requests")
export class LeaveRequest {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "employee_id" })
  employeeId: string;

  @ManyToOne(() => Employee, (employee) => employee.leaveRequests, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "employee_id" })
  employee: Employee;

  @Column({
    name: "leave_type",
    type: "enum",
    enum: LeaveType,
  })
  leaveType: LeaveType;

  @Column({ name: "start_date", type: "date" })
  startDate: Date;

  @Column({ name: "end_date", type: "date" })
  endDate: Date;

  @Column({
    name: "days_count",
    type: "decimal",
    precision: 5,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  daysCount: number;

  @Column({ name: "is_half_day", type: "boolean", default: false })
  isHalfDay: boolean;

  @Column({ type: "text", nullable: true })
  reason: string;

  @Column({
    type: "enum",
    enum: LeaveStatus,
    default: LeaveStatus.PENDING,
  })
  status: LeaveStatus;

  @Column({
    name: "applied_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  appliedAt: Date;

  @Column({ name: "approved_by", nullable: true })
  approvedBy: string;

  @ManyToOne(() => Employee, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "approved_by" })
  approver: Employee;

  @Column({ name: "approved_at", type: "timestamp", nullable: true })
  approvedAt: Date;

  @Column({ name: "rejection_reason", type: "text", nullable: true })
  rejectionReason: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
