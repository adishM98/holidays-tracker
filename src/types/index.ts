export type UserRole = 'employee' | 'manager' | 'admin';

export type LeaveType = 'sick' | 'casual' | 'earned' | 'compensation';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    fullName: string;
    position?: string;
    department?: {
      id: string;
      name: string;
    };
    joiningDate: string;
    manager?: {
      id: string;
      fullName: string;
    };
  };
}

export interface LeaveBalance {
  id: string;
  year: number;
  leaveType: LeaveType;
  totalAllocated: number;
  usedDays: number;
  availableDays: number;
  carryForward: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason?: string;
  status: LeaveStatus;
  appliedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  employee: {
    id: string;
    employeeId: string;
    fullName: string;
    department?: {
      name: string;
    };
  };
  approver?: {
    id: string;
    fullName: string;
  };
}

export interface DashboardData {
  employee: {
    id: string;
    employeeId: string;
    fullName: string;
    position?: string;
    department?: string;
    joiningDate: string;
    manager?: {
      id: string;
      name: string;
    };
  };
  leaveBalances: LeaveBalance[];
  stats: {
    pendingRequests: number;
    totalRequests: number;
    approvedThisYear: number;
  };
  recentRequests: LeaveRequest[];
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}