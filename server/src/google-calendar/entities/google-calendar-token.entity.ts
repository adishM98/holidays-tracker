import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('google_calendar_tokens')
export class GoogleCalendarToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', unique: true })
  employeeId: string;

  @OneToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'access_token', type: 'text' })
  @Exclude()
  accessToken: string;

  @Column({ name: 'refresh_token', type: 'text' })
  @Exclude()
  refreshToken: string;

  @Column({ name: 'token_expiry', type: 'timestamp' })
  tokenExpiry: Date;

  @Column({ name: 'scope', type: 'text' })
  scope: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_sync_at', type: 'timestamp', nullable: true })
  lastSyncAt: Date;

  @Column({ name: 'last_sync_error', type: 'text', nullable: true })
  lastSyncError: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
