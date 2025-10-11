import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LeaveRequest } from '../../leaves/entities/leave-request.entity';

export enum CalendarType {
  PERSONAL = 'personal',
  SHARED = 'shared',
}

@Entity('calendar_events')
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'leave_request_id' })
  leaveRequestId: string;

  @ManyToOne(() => LeaveRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leave_request_id' })
  leaveRequest: LeaveRequest;

  @Column({ name: 'google_event_id' })
  googleEventId: string;

  @Column({ name: 'calendar_id' })
  calendarId: string;

  @Column({
    name: 'calendar_type',
    type: 'enum',
    enum: CalendarType,
  })
  calendarType: CalendarType;

  @Column({ name: 'employee_id' })
  employeeId: string;

  @Column({ name: 'sync_status', default: 'synced' })
  syncStatus: string; // synced, failed, pending

  @Column({ name: 'sync_error', type: 'text', nullable: true })
  syncError: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
