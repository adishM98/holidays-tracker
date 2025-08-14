import { LeaveRequest } from '@/types';

export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: '1',
    employeeId: '1',
    employeeName: 'John Doe',
    leaveType: 'paid',
    startDate: '2024-08-20',
    endDate: '2024-08-22',
    days: 3,
    reason: 'Family vacation',
    status: 'pending',
    appliedAt: '2024-08-15T10:30:00Z'
  },
  {
    id: '2',
    employeeId: '1',
    employeeName: 'John Doe',
    leaveType: 'sick',
    startDate: '2024-08-10',
    endDate: '2024-08-10',
    days: 1,
    reason: 'Doctor appointment',
    status: 'approved',
    appliedAt: '2024-08-08T09:15:00Z',
    reviewedBy: 'Sarah Johnson',
    reviewedAt: '2024-08-08T14:20:00Z'
  },
  {
    id: '3',
    employeeId: '3',
    employeeName: 'Mike Wilson',
    leaveType: 'casual',
    startDate: '2024-08-25',
    endDate: '2024-08-27',
    days: 3,
    reason: 'Personal work',
    status: 'pending',
    appliedAt: '2024-08-14T16:45:00Z'
  },
  {
    id: '4',
    employeeId: '4',
    employeeName: 'Emily Chen',
    leaveType: 'paid',
    startDate: '2024-08-18',
    endDate: '2024-08-20',
    days: 3,
    reason: 'Wedding ceremony',
    status: 'approved',
    appliedAt: '2024-08-12T11:20:00Z',
    reviewedBy: 'Sarah Johnson',
    reviewedAt: '2024-08-13T10:15:00Z'
  }
];

export const leaveTypeLabels = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  casual: 'Casual Leave',
  maternity: 'Maternity Leave',
  paternity: 'Paternity Leave',
  unpaid: 'Unpaid Leave'
};

export const statusConfig = {
  pending: {
    label: 'Pending',
    className: 'bg-warning-light text-warning border-warning/20'
  },
  approved: {
    label: 'Approved',
    className: 'bg-success-light text-success border-success/20'
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-destructive-light text-destructive border-destructive/20'
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-muted text-muted-foreground border-muted/20'
  }
};