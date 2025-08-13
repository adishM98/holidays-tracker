export type UserRole = 'employee' | 'manager';

export type LeaveType = 'paid' | 'sick' | 'casual' | 'maternity' | 'emergency';

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  department: string;
  leaveBalance: {
    paid: number;
    sick: number;
    casual: number;
  };
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  comments?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
}