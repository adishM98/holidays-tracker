// API configuration and utilities
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`;

// Types for API responses
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    mustChangePassword: boolean;
  };
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Set auth token in localStorage
const setAuthToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

// Remove auth token from localStorage
const removeAuthToken = (): void => {
  localStorage.removeItem('auth_token');
};

// API request helper with authentication and automatic token refresh
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> => {
  const token = getAuthToken();
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    // Handle 401 Unauthorized - attempt token refresh
    if (response.status === 401 && retryCount === 0) {
      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken && !endpoint.includes('/auth/refresh')) {
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          
          if (refreshResponse.ok) {
            const { access_token } = await refreshResponse.json();
            setAuthToken(access_token);
            
            // Retry the original request with new token
            return apiRequest<T>(endpoint, options, retryCount + 1);
          } else {
            // Refresh token is invalid, clear auth data and redirect to login
            removeAuthToken();
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_data');
            window.location.href = '/login';
            throw new Error('Session expired. Please login again.');
          }
        }
      } catch (refreshError) {
        // Refresh failed, clear auth data and redirect to login
        removeAuthToken();
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
    }
    
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Authentication API
export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.access_token) {
      setAuthToken(response.access_token);
    }
    
    return response;
  },

  logout: async (): Promise<void> => {
    removeAuthToken();
    localStorage.removeItem('user_data');
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
    return apiRequest('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  forgotPassword: async (email: string): Promise<void> => {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  refreshToken: async (): Promise<{ access_token: string }> => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiRequest<{ access_token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (response.access_token) {
      setAuthToken(response.access_token);
    }

    return response;
  },
};

// Employee API
export const employeeAPI = {
  getDashboard: async () => {
    return apiRequest('/employee/dashboard');
  },

  getProfile: async () => {
    return apiRequest('/employee/profile');
  },

  updateProfile: async (data: any) => {
    return apiRequest('/employee/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getLeaveBalance: async (year?: number) => {
    const queryParam = year ? `?year=${year}` : '';
    return apiRequest(`/employee/leave-balance${queryParam}`);
  },

  getLeaveRequests: async (page = 1, limit = 10, status?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
    });
    return apiRequest(`/employee/leave-requests?${params}`);
  },

  createLeaveRequest: async (data: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason?: string;
    isHalfDay?: boolean;
  }) => {
    return apiRequest('/employee/leave-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  cancelLeaveRequest: async (requestId: string) => {
    return apiRequest(`/employee/leave-requests/${requestId}/cancel`, {
      method: 'PUT',
    });
  },

  getLeaveHistory: async (year?: number, type?: string) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (type) params.append('type', type);
    
    const queryString = params.toString() ? `?${params}` : '';
    return apiRequest(`/employee/leave-history${queryString}`);
  },

  getLeaveCalendar: async (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    
    const queryString = params.toString() ? `?${params}` : '';
    return apiRequest(`/employee/leave-calendar${queryString}`);
  },

  getHolidays: async (year?: number) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    params.append('isActive', 'true'); // Only get active holidays
    
    const queryString = params.toString() ? `?${params}` : '';
    return apiRequest(`/employee/holidays${queryString}`);
  },
};

// Manager API
export const managerAPI = {
  getDashboardStats: async () => {
    return apiRequest('/manager/dashboard-stats');
  },

  getTeamMembers: async () => {
    return apiRequest('/manager/team-members');
  },

  getTeamRequests: async (page = 1, limit = 10, status?: string, employeeId?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
      ...(employeeId && { employee: employeeId }),
    });
    return apiRequest(`/manager/team-requests?${params}`);
  },

  approveLeaveRequest: async (requestId: string, comments?: string) => {
    return apiRequest(`/manager/leave-requests/${requestId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ comments }),
    });
  },

  rejectLeaveRequest: async (requestId: string, rejectionReason: string) => {
    return apiRequest(`/manager/leave-requests/${requestId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ rejectionReason }),
    });
  },

  getTeamCalendar: async (month: number, year: number) => {
    return apiRequest(`/manager/team-calendar?month=${month}&year=${year}`);
  },

  getTeamLeaveSummary: async (year?: number) => {
    const queryParam = year ? `?year=${year}` : '';
    return apiRequest(`/manager/reports/team-leave-summary${queryParam}`);
  },
};

// Admin API
export const adminAPI = {
  getDashboardStats: async () => {
    return apiRequest('/admin/dashboard-stats');
  },

  getEmployees: async (page = 1, limit = 10, search?: string, department?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(department && { department }),
    });
    return apiRequest(`/admin/employees?${params}`);
  },

  createEmployee: async (data: any) => {
    return apiRequest('/admin/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateEmployee: async (id: string, data: any) => {
    return apiRequest(`/admin/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteEmployee: async (id: string) => {
    return apiRequest(`/admin/employees/${id}`, {
      method: 'DELETE',
    });
  },

  updateEmployeeLeaveBalance: async (id: string, data: { earnedBalance: number; sickBalance: number; casualBalance: number }) => {
    return apiRequest(`/admin/employees/${id}/leave-balance`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },


  downloadImportTemplate: async () => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/employees/import-template`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.text();
  },

  bulkImportEmployees: async (fileOrFormData: File | FormData) => {
    const token = getAuthToken();
    
    // Create FormData if a File was passed directly
    let formData: FormData;
    if (fileOrFormData instanceof FormData) {
      formData = fileOrFormData;
    } else {
      formData = new FormData();
      formData.append('file', fileOrFormData);
    }
    
    const response = await fetch(`${API_BASE_URL}/admin/employees/bulk-import`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // Don't set Content-Type for FormData, let the browser set it with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  getLeaveSummaryReport: async (year?: number, department?: string) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (department) params.append('department', department);
    
    const queryString = params.toString() ? `?${params}` : '';
    return apiRequest(`/admin/reports/leave-summary${queryString}`);
  },

  getDepartments: async () => {
    return apiRequest('/admin/departments');
  },

  getEmployeeLeaveBalance: async (employeeId: string, year?: number) => {
    const queryParam = year ? `?year=${year}` : '';
    return apiRequest(`/admin/employees/${employeeId}/leave-balance${queryParam}`);
  },

  getBulkLeaveBalances: async (year?: number, departmentId?: string) => {
    try {
      const params = new URLSearchParams();
      if (year) params.append('year', year.toString());
      if (departmentId) params.append('department', departmentId);

      const queryString = params.toString() ? `?${params}` : '';
      return apiRequest(`/admin/leave-balances/bulk${queryString}`);
    } catch (error) {
      // If bulk endpoint doesn't exist (like in production), throw error to trigger fallback
      throw new Error('Bulk endpoint not available');
    }
  },

  createDepartment: async (data: { name: string; managerId?: string }) => {
    return apiRequest('/admin/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getLeaveCalendar: async (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    
    const queryString = params.toString() ? `?${params}` : '';
    return apiRequest(`/admin/leave-calendar${queryString}`);
  },

  getAllLeaveRequests: async (status?: string, month?: number, year?: number, forReporting = false) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());

    // Always use higher limit for reports to ensure we get all data
    // This fixes the production issue where only 10 requests were being fetched
    params.append('limit', '1000');

    const queryString = params.toString() ? `?${params}` : '';
    return apiRequest(`/admin/leave-requests${queryString}`);
  },

  createLeaveForEmployee: async (data: {
    employeeId: string;
    leaveType: 'earned' | 'sick' | 'casual' | 'compensation';
    startDate: string;
    endDate: string;
    reason: string;
    status?: 'approved' | 'pending';
    isHalfDay?: boolean;
  }) => {
    return apiRequest('/admin/leave-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateLeaveRequest: async (id: string, data: {
    leaveType?: 'earned' | 'sick' | 'casual' | 'compensation';
    startDate?: string;
    endDate?: string;
    reason?: string;
  }) => {
    return apiRequest(`/admin/leave-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteLeaveRequest: async (id: string) => {
    return apiRequest(`/admin/leave-requests/${id}`, {
      method: 'DELETE',
    });
  },

  approveLeaveRequest: async (requestId: string, comments?: string) => {
    return apiRequest(`/admin/leave-requests/${requestId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ comments }),
    });
  },

  rejectLeaveRequest: async (requestId: string, rejectionReason: string) => {
    return apiRequest(`/admin/leave-requests/${requestId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ rejectionReason }),
    });
  },

  // Reports API
  getEmployeeLeaveReport: async (employeeId?: string, year?: number) => {
    const params = new URLSearchParams();
    if (employeeId) params.append('employeeId', employeeId);
    if (year) params.append('year', year.toString());
    
    const queryString = params.toString() ? `?${params}` : '';
    return apiRequest(`/admin/reports/employee-leave${queryString}`);
  },

  getApprovalBottlenecks: async (days?: number) => {
    const params = new URLSearchParams();
    if (days) params.append('days', days.toString());
    
    const queryString = params.toString() ? `?${params}` : '';
    return apiRequest(`/admin/reports/approval-bottlenecks${queryString}`);
  },

  getLowUtilizationReport: async (year?: number, threshold?: number) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (threshold) params.append('threshold', threshold.toString());
    
    const queryString = params.toString() ? `?${params}` : '';
    return apiRequest(`/admin/reports/low-utilization${queryString}`);
  },

  getDepartmentComparison: async (year?: number) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    
    const queryString = params.toString() ? `?${params}` : '';
    return apiRequest(`/admin/reports/department-comparison${queryString}`);
  },

  // Holiday Management
  getHolidays: async (year?: number, isActive?: boolean) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (isActive !== undefined) params.append('isActive', isActive.toString());
    
    const queryString = params.toString() ? `?${params}` : '';
    return apiRequest(`/admin/holidays${queryString}`);
  },

  getHoliday: async (id: string) => {
    return apiRequest(`/admin/holidays/${id}`);
  },

  createHoliday: async (data: {
    name: string;
    date: string;
    description?: string;
    isRecurring?: boolean;
    isActive?: boolean;
  }) => {
    return apiRequest('/admin/holidays', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateHoliday: async (id: string, data: {
    name?: string;
    date?: string;
    description?: string;
    isRecurring?: boolean;
    isActive?: boolean;
  }) => {
    return apiRequest(`/admin/holidays/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteHoliday: async (id: string) => {
    return apiRequest(`/admin/holidays/${id}`, {
      method: 'DELETE',
    });
  },

  getUpcomingHolidays: async (days: number = 30) => {
    return apiRequest(`/admin/holidays/upcoming/${days}`);
  },

  resetEmployeePassword: async (employeeId: string): Promise<{ tempPassword: string }> => {
    return apiRequest(`/admin/employees/${employeeId}/reset-password`, {
      method: 'POST',
    });
  },

  deactivateEmployee: async (employeeId: string): Promise<void> => {
    return apiRequest(`/admin/employees/${employeeId}/deactivate`, {
      method: 'PUT',
    });
  },

  activateEmployee: async (employeeId: string): Promise<void> => {
    return apiRequest(`/admin/employees/${employeeId}/activate`, {
      method: 'PUT',
    });
  },

  regenerateInvite: async (employeeId: string): Promise<void> => {
    return apiRequest(`/admin/employees/${employeeId}/regenerate-invite`, {
      method: 'POST',
    });
  },
};

export { getAuthToken, setAuthToken, removeAuthToken };