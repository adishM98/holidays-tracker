import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { LeaveType } from '../../common/enums/leave-type.enum';

@Entity('leave_balances')
@Unique(['employeeId', 'year', 'leaveType'])
export class LeaveBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id' })
  employeeId: string;

  @ManyToOne(() => Employee, (employee) => employee.leaveBalances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column()
  year: number;

  @Column({
    name: 'leave_type',
    type: 'enum',
    enum: LeaveType,
  })
  leaveType: LeaveType;

  @Column({ name: 'total_allocated', type: 'decimal', precision: 5, scale: 2 })
  totalAllocated: number;

  @Column({ name: 'used_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
  usedDays: number;

  @Column({ name: 'available_days', type: 'decimal', precision: 5, scale: 2 })
  availableDays: number;

  @Column({ name: 'carry_forward', type: 'decimal', precision: 5, scale: 2, default: 0 })
  carryForward: number;
}