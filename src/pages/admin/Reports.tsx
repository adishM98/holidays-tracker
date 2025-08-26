import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  Users, 
  AlertTriangle, 
  Download,
  Clock,
  BarChart3,
  Filter,
  ChevronDown,
  TrendingUp,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/services/api';

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  joiningDate: string;
  annualLeaveDays: number;
  sickLeaveDays: number;
  casualLeaveDays: number;
  department: {
    id: string;
    name: string;
  };
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  user?: {
    email: string;
  };
}

const Reports: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of current year
    endDate: new Date().toISOString().split('T')[0] // Today
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [employeesResponse, departmentsResponse, leaveRequestsResponse] = await Promise.all([
        adminAPI.getEmployees(1, 100),
        adminAPI.getDepartments(),
        adminAPI.getAllLeaveRequests(),
      ]);
      
      const employeesData = employeesResponse.employees || employeesResponse.data?.employees || [];
      setEmployees(employeesData);
      setDepartments(departmentsResponse || []);
      setLeaveRequests(leaveRequestsResponse?.requests || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load initial data",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = getNestedValue(row, header);
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj) || '';
  };

  const calculateLeaveBalance = (employee: Employee, leaveType: string) => {
    const employeeRequests = leaveRequests.filter(req => req.employee?.id === employee.id);
    const approvedRequests = employeeRequests.filter(req => req.status === 'approved' && req.leaveType === leaveType);
    
    const usedDays = approvedRequests.reduce((total, req) => {
      const startDate = new Date(req.startDate);
      const endDate = new Date(req.endDate);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return total + diffDays;
    }, 0);

    let totalAllocated = 0;
    switch (leaveType) {
      case 'earned':
        totalAllocated = employee.annualLeaveDays;
        break;
      case 'sick':
        totalAllocated = employee.sickLeaveDays;
        break;
      case 'casual':
        totalAllocated = employee.casualLeaveDays;
        break;
      default:
        totalAllocated = 0;
    }

    return {
      total: totalAllocated,
      used: usedDays,
      remaining: totalAllocated - usedDays
    };
  };

  const generateComprehensiveReport = () => {
    let filteredEmployees = employees;
    
    // Apply filters
    if (selectedDepartment !== 'all') {
      filteredEmployees = filteredEmployees.filter(emp => emp.department?.id === selectedDepartment);
    }
    
    if (selectedEmployee !== 'all') {
      filteredEmployees = filteredEmployees.filter(emp => emp.id === selectedEmployee);
    }

    const reportData = filteredEmployees.map(emp => {
      const earnedBalance = calculateLeaveBalance(emp, 'earned');
      const sickBalance = calculateLeaveBalance(emp, 'sick');
      const casualBalance = calculateLeaveBalance(emp, 'casual');
      const compensationBalance = calculateLeaveBalance(emp, 'compensation');
      
      // Count pending requests
      const pendingRequests = leaveRequests.filter(req => 
        req.employee?.id === emp.id && req.status === 'pending'
      ).length;

      // Check if currently on leave
      const today = new Date();
      const currentLeave = leaveRequests.find(req => {
        if (req.employee?.id !== emp.id || req.status !== 'approved') return false;
        const startDate = new Date(req.startDate);
        const endDate = new Date(req.endDate);
        return today >= startDate && today <= endDate;
      });

      return {
        'Employee ID': emp.employeeId || 'N/A',
        'First Name': emp.firstName,
        'Last Name': emp.lastName,
        'Email': emp.email || emp.user?.email || 'N/A',
        'Department': emp.department?.name || 'N/A',
        'Position': emp.position || 'N/A',
        'Manager': emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : 'N/A',
        'Joining Date': emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : 'N/A',
        'Current Status': currentLeave ? `On Leave (${currentLeave.leaveType})` : 'Active',
        'Pending Requests': pendingRequests,
        'Earned Leave - Total': earnedBalance.total,
        'Earned Leave - Used': earnedBalance.used,
        'Earned Leave - Remaining': earnedBalance.remaining,
        'Sick Leave - Total': sickBalance.total,
        'Sick Leave - Used': sickBalance.used,
        'Sick Leave - Remaining': sickBalance.remaining,
        'Casual Leave - Total': casualBalance.total,
        'Casual Leave - Used': casualBalance.used,
        'Casual Leave - Remaining': casualBalance.remaining,
        'Compensation Off - Used': compensationBalance.used,
        'Total Leave Days Used': earnedBalance.used + sickBalance.used + casualBalance.used,
        'Total Leave Days Remaining': earnedBalance.remaining + sickBalance.remaining + casualBalance.remaining
      };
    });

    const headers = [
      'Employee ID', 'First Name', 'Last Name', 'Email', 'Department', 'Position', 'Manager', 
      'Joining Date', 'Current Status', 'Pending Requests',
      'Earned Leave - Total', 'Earned Leave - Used', 'Earned Leave - Remaining',
      'Sick Leave - Total', 'Sick Leave - Used', 'Sick Leave - Remaining',
      'Casual Leave - Total', 'Casual Leave - Used', 'Casual Leave - Remaining',
      'Compensation Off - Used', 'Total Leave Days Used', 'Total Leave Days Remaining'
    ];

    return { reportData, headers };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Comprehensive leave management insights and reports</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters & Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Department</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Employee</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - {employee.department?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col justify-end">
              <Button 
                className="h-10"
                onClick={() => {
                  const { reportData, headers } = generateComprehensiveReport();
                  const filename = selectedEmployee !== 'all' 
                    ? `employee_detailed_report_${dateRange.startDate}_to_${dateRange.endDate}`
                    : `employees_comprehensive_report_${dateRange.startDate}_to_${dateRange.endDate}`;
                  exportToCSV(reportData, filename, headers);
                  
                  toast({
                    title: "Export Complete",
                    description: `Generated report with ${reportData.length} employee(s) and comprehensive leave data`,
                  });
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Detailed Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Sample Report Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border dark:border-blue-800/50">
                <h3 className="font-medium text-blue-900 dark:text-blue-100">Total Employees</h3>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{employees.length}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border dark:border-green-800/50">
                <h3 className="font-medium text-green-900 dark:text-green-100">Departments</h3>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{departments.length}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg border dark:border-purple-800/50">
                <h3 className="font-medium text-purple-900 dark:text-purple-100">Total Leave Requests</h3>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{leaveRequests.length}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg border dark:border-orange-800/50">
                <h3 className="font-medium text-orange-900 dark:text-orange-100">Pending Requests</h3>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {leaveRequests.filter(req => req.status === 'pending').length}
                </p>
              </div>
            </div>
            
            {selectedEmployee && selectedEmployee !== 'all' && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border dark:border-gray-700/50">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Selected Employee</h4>
                <p className="text-gray-700 dark:text-gray-300">{employees.find(emp => emp.id === selectedEmployee)?.firstName} {employees.find(emp => emp.id === selectedEmployee)?.lastName}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default Reports;