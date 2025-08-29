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
  Target,
  FileDown,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  const [selectedReportType, setSelectedReportType] = useState<string>('all');
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

  const exportToExcel = (data: any[], filename: string, headers: string[]) => {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Convert data to array format for Excel
    const excelData = [
      headers,
      ...data.map(row => 
        headers.map(header => getNestedValue(row, header))
      )
    ];
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Set column widths
    const colWidths = headers.map(() => ({ wch: 15 }));
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Employee Report');
    
    // Write file
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportToPDF = (data: any[], filename: string, headers: string[]) => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
    
    // Add title
    doc.setFontSize(16);
    doc.text('Employee Leave Report', 14, 15);
    
    // Add generation date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 25);
    
    // Filter data for better PDF display (only essential columns)
    const essentialHeaders = [
      'Employee ID', 'First Name', 'Last Name', 'Department', 'Position', 
      'Current Status', 'Total Requests', 'Earned Leave - Remaining', 'Sick Leave - Remaining', 
      'Casual Leave - Remaining', 'Leave Utilization %'
    ];
    
    const pdfData = data.map(row => 
      essentialHeaders.map(header => String(getNestedValue(row, header) || ''))
    );
    
    // Add table
    autoTable(doc, {
      head: [essentialHeaders],
      body: pdfData,
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { top: 35, left: 14, right: 14 },
      tableWidth: 'auto',
      columnStyles: {
        0: { cellWidth: 20 }, // Employee ID
        1: { cellWidth: 25 }, // First Name
        2: { cellWidth: 25 }, // Last Name
        3: { cellWidth: 30 }, // Department
        4: { cellWidth: 35 }, // Position
        5: { cellWidth: 25 }, // Current Status
        6: { cellWidth: 20 }, // Earned Remaining
        7: { cellWidth: 20 }, // Sick Remaining
        8: { cellWidth: 20 }, // Casual Remaining
        9: { cellWidth: 25 }  // Total Used
      }
    });
    
    // Save PDF
    doc.save(`${filename}.pdf`);
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
    
    // Apply date range filter to leave requests
    const filteredLeaveRequests = leaveRequests.filter(req => {
      if (!req.startDate) return false;
      const startDate = new Date(req.startDate);
      const filterStartDate = new Date(dateRange.startDate);
      const filterEndDate = new Date(dateRange.endDate);
      return startDate >= filterStartDate && startDate <= filterEndDate;
    });

    const reportData = filteredEmployees.map(emp => {
      const earnedBalance = calculateLeaveBalance(emp, 'earned');
      const sickBalance = calculateLeaveBalance(emp, 'sick');
      const casualBalance = calculateLeaveBalance(emp, 'casual');
      const compensationBalance = calculateLeaveBalance(emp, 'compensation');
      
      // Count pending requests in date range
      const pendingRequests = filteredLeaveRequests.filter(req => 
        req.employee?.id === emp.id && req.status === 'pending'
      ).length;
      
      // Count approved requests in date range
      const approvedRequests = filteredLeaveRequests.filter(req => 
        req.employee?.id === emp.id && req.status === 'approved'
      ).length;
      
      // Count rejected requests in date range
      const rejectedRequests = filteredLeaveRequests.filter(req => 
        req.employee?.id === emp.id && req.status === 'rejected'
      ).length;

      // Check if currently on leave
      const today = new Date();
      const currentLeave = leaveRequests.find(req => {
        if (req.employee?.id !== emp.id || req.status !== 'approved') return false;
        const startDate = new Date(req.startDate);
        const endDate = new Date(req.endDate);
        return today >= startDate && today <= endDate;
      });
      
      // Calculate average days per request
      const totalRequests = filteredLeaveRequests.filter(req => req.employee?.id === emp.id);
      const avgDaysPerRequest = totalRequests.length > 0 
        ? (earnedBalance.used + sickBalance.used + casualBalance.used) / totalRequests.length
        : 0;

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
        'Approved Requests': approvedRequests,
        'Rejected Requests': rejectedRequests,
        'Total Requests': pendingRequests + approvedRequests + rejectedRequests,
        'Avg Days Per Request': Math.round(avgDaysPerRequest * 10) / 10,
        'Earned Leave - Total': earnedBalance.total,
        'Earned Leave - Used': earnedBalance.used,
        'Earned Leave - Remaining': earnedBalance.remaining,
        'Earned Leave - Utilization %': earnedBalance.total > 0 ? Math.round((earnedBalance.used / earnedBalance.total) * 100) : 0,
        'Sick Leave - Total': sickBalance.total,
        'Sick Leave - Used': sickBalance.used,
        'Sick Leave - Remaining': sickBalance.remaining,
        'Sick Leave - Utilization %': sickBalance.total > 0 ? Math.round((sickBalance.used / sickBalance.total) * 100) : 0,
        'Casual Leave - Total': casualBalance.total,
        'Casual Leave - Used': casualBalance.used,
        'Casual Leave - Remaining': casualBalance.remaining,
        'Casual Leave - Utilization %': casualBalance.total > 0 ? Math.round((casualBalance.used / casualBalance.total) * 100) : 0,
        'Compensation Off - Used': compensationBalance.used,
        'Total Leave Days Used': earnedBalance.used + sickBalance.used + casualBalance.used,
        'Total Leave Days Remaining': earnedBalance.remaining + sickBalance.remaining + casualBalance.remaining,
        'Leave Utilization %': (earnedBalance.total + sickBalance.total + casualBalance.total) > 0 
          ? Math.round(((earnedBalance.used + sickBalance.used + casualBalance.used) / (earnedBalance.total + sickBalance.total + casualBalance.total)) * 100) 
          : 0
      };
    });

    const headers = [
      'Employee ID', 'First Name', 'Last Name', 'Email', 'Department', 'Position', 'Manager', 
      'Joining Date', 'Current Status', 'Pending Requests', 'Approved Requests', 'Rejected Requests',
      'Total Requests', 'Avg Days Per Request',
      'Earned Leave - Total', 'Earned Leave - Used', 'Earned Leave - Remaining', 'Earned Leave - Utilization %',
      'Sick Leave - Total', 'Sick Leave - Used', 'Sick Leave - Remaining', 'Sick Leave - Utilization %',
      'Casual Leave - Total', 'Casual Leave - Used', 'Casual Leave - Remaining', 'Casual Leave - Utilization %',
      'Compensation Off - Used', 'Total Leave Days Used', 'Total Leave Days Remaining', 'Leave Utilization %'
    ];

    return { reportData, headers };
  };

  const generateDepartmentSummary = () => {
    const deptSummary = departments.map(dept => {
      const deptEmployees = employees.filter(emp => emp.department?.id === dept.id);
      const deptLeaveRequests = leaveRequests.filter(req => 
        deptEmployees.some(emp => emp.id === req.employee?.id)
      );
      
      const totalEarned = deptEmployees.reduce((sum, emp) => sum + (emp.annualLeaveDays || 0), 0);
      const totalSick = deptEmployees.reduce((sum, emp) => sum + (emp.sickLeaveDays || 0), 0);
      const totalCasual = deptEmployees.reduce((sum, emp) => sum + (emp.casualLeaveDays || 0), 0);
      
      const approvedRequests = deptLeaveRequests.filter(req => req.status === 'approved');
      const pendingRequests = deptLeaveRequests.filter(req => req.status === 'pending');
      
      const totalUsedDays = approvedRequests.reduce((sum, req) => {
        const startDate = new Date(req.startDate);
        const endDate = new Date(req.endDate);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return sum + diffDays;
      }, 0);
      
      return {
        departmentName: dept.name,
        employeeCount: deptEmployees.length,
        totalAllocatedDays: totalEarned + totalSick + totalCasual,
        totalUsedDays,
        pendingRequestsCount: pendingRequests.length,
        approvedRequestsCount: approvedRequests.length,
        utilizationRate: (totalEarned + totalSick + totalCasual) > 0 
          ? Math.round((totalUsedDays / (totalEarned + totalSick + totalCasual)) * 100)
          : 0
      };
    });
    
    return deptSummary;
  };

  const generatePendingRequestsReport = () => {
    const pendingRequests = leaveRequests.filter(req => req.status === 'pending');
    const reportData = pendingRequests.map(req => ({
      'Employee ID': req.employee?.employeeId || 'N/A',
      'Employee Name': `${req.employee?.firstName || ''} ${req.employee?.lastName || ''}`.trim(),
      'Department': req.employee?.department?.name || 'N/A',
      'Leave Type': req.leaveType,
      'Start Date': new Date(req.startDate).toLocaleDateString(),
      'End Date': new Date(req.endDate).toLocaleDateString(),
      'Days Count': req.daysCount || 0,
      'Reason': req.reason || 'N/A',
      'Applied Date': new Date(req.createdAt).toLocaleDateString(),
      'Manager': req.approvedBy ? 'Assigned' : 'Not Assigned',
      'Days Pending': Math.ceil((new Date().getTime() - new Date(req.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    }));
    
    const headers = [
      'Employee ID', 'Employee Name', 'Department', 'Leave Type', 'Start Date', 'End Date', 
      'Days Count', 'Reason', 'Applied Date', 'Manager', 'Days Pending'
    ];
    
    return { reportData, headers };
  };

  const generateAttendanceReport = () => {
    // Generate day-wise attendance based on approved leaves
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const attendanceData = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(currentYear, currentMonth, day);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const employeesOnLeave = leaveRequests.filter(req => {
        if (req.status !== 'approved') return false;
        const startDate = new Date(req.startDate);
        const endDate = new Date(req.endDate);
        return currentDate >= startDate && currentDate <= endDate;
      });
      
      attendanceData.push({
        'Date': currentDate.toLocaleDateString(),
        'Day': currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
        'Total Employees': employees.length,
        'Employees on Leave': employeesOnLeave.length,
        'Present': employees.length - employeesOnLeave.length,
        'Attendance %': employees.length > 0 ? Math.round(((employees.length - employeesOnLeave.length) / employees.length) * 100) : 0,
        'Leave Details': employeesOnLeave.map(req => `${req.employee?.firstName} ${req.employee?.lastName} (${req.leaveType})`).join(', ') || 'None'
      });
    }
    
    const headers = ['Date', 'Day', 'Total Employees', 'Employees on Leave', 'Present', 'Attendance %', 'Leave Details'];
    return { reportData: attendanceData, headers };
  };

  const generateLeaveBalanceReport = (type: 'opening' | 'closing') => {
    const reportData = employees.map(emp => {
      const earnedBalance = calculateLeaveBalance(emp, 'earned');
      const sickBalance = calculateLeaveBalance(emp, 'sick');
      const casualBalance = calculateLeaveBalance(emp, 'casual');
      
      return {
        'Employee ID': emp.employeeId || 'N/A',
        'Employee Name': `${emp.firstName} ${emp.lastName}`,
        'Department': emp.department?.name || 'N/A',
        'Joining Date': emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : 'N/A',
        'Earned Leave - Opening': type === 'opening' ? earnedBalance.total : earnedBalance.remaining,
        'Sick Leave - Opening': type === 'opening' ? sickBalance.total : sickBalance.remaining,
        'Casual Leave - Opening': type === 'opening' ? casualBalance.total : casualBalance.remaining,
        'Earned Leave - Used': earnedBalance.used,
        'Sick Leave - Used': sickBalance.used,
        'Casual Leave - Used': casualBalance.used,
        'Earned Leave - Balance': earnedBalance.remaining,
        'Sick Leave - Balance': sickBalance.remaining,
        'Casual Leave - Balance': casualBalance.remaining,
        'Total Opening Balance': type === 'opening' 
          ? earnedBalance.total + sickBalance.total + casualBalance.total
          : earnedBalance.remaining + sickBalance.remaining + casualBalance.remaining
      };
    });
    
    const headers = [
      'Employee ID', 'Employee Name', 'Department', 'Joining Date',
      'Earned Leave - Opening', 'Sick Leave - Opening', 'Casual Leave - Opening',
      'Earned Leave - Used', 'Sick Leave - Used', 'Casual Leave - Used',
      'Earned Leave - Balance', 'Sick Leave - Balance', 'Casual Leave - Balance',
      'Total Opening Balance'
    ];
    
    return { reportData, headers };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Detailed Leave Analytics and Reports</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Types</label>
              <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending Requests</SelectItem>
                  <SelectItem value="attendance">Day-wise Attendance</SelectItem>
                  <SelectItem value="opening">Opening Balance</SelectItem>
                  <SelectItem value="closing">Closing Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-10">
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    onClick={() => {
                      let reportData, headers, filename;
                      
                      if (selectedReportType === 'pending') {
                        ({ reportData, headers } = generatePendingRequestsReport());
                        filename = `pending_requests_${dateRange.startDate}_to_${dateRange.endDate}`;
                      } else if (selectedReportType === 'attendance') {
                        ({ reportData, headers } = generateAttendanceReport());
                        filename = `attendance_report_${dateRange.startDate}_to_${dateRange.endDate}`;
                      } else if (selectedReportType === 'opening') {
                        ({ reportData, headers } = generateLeaveBalanceReport('opening'));
                        filename = `opening_balance_${dateRange.startDate}_to_${dateRange.endDate}`;
                      } else if (selectedReportType === 'closing') {
                        ({ reportData, headers } = generateLeaveBalanceReport('closing'));
                        filename = `closing_balance_${dateRange.startDate}_to_${dateRange.endDate}`;
                      } else {
                        ({ reportData, headers } = generateComprehensiveReport());
                        filename = selectedEmployee !== 'all' 
                          ? `employee_detailed_report_${dateRange.startDate}_to_${dateRange.endDate}`
                          : `employees_comprehensive_report_${dateRange.startDate}_to_${dateRange.endDate}`;
                      }
                      
                      exportToCSV(reportData, filename, headers);
                      
                      toast({
                        title: "CSV Export Complete",
                        description: `Generated ${selectedReportType === 'all' ? 'comprehensive' : selectedReportType} report with ${reportData.length} record(s)`,
                      });
                    }}
                    className="flex items-center"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => {
                      let reportData, headers, filename;
                      
                      if (selectedReportType === 'pending') {
                        ({ reportData, headers } = generatePendingRequestsReport());
                        filename = `pending_requests_${dateRange.startDate}_to_${dateRange.endDate}`;
                      } else if (selectedReportType === 'attendance') {
                        ({ reportData, headers } = generateAttendanceReport());
                        filename = `attendance_report_${dateRange.startDate}_to_${dateRange.endDate}`;
                      } else if (selectedReportType === 'opening') {
                        ({ reportData, headers } = generateLeaveBalanceReport('opening'));
                        filename = `opening_balance_${dateRange.startDate}_to_${dateRange.endDate}`;
                      } else if (selectedReportType === 'closing') {
                        ({ reportData, headers } = generateLeaveBalanceReport('closing'));
                        filename = `closing_balance_${dateRange.startDate}_to_${dateRange.endDate}`;
                      } else {
                        ({ reportData, headers } = generateComprehensiveReport());
                        filename = selectedEmployee !== 'all' 
                          ? `employee_detailed_report_${dateRange.startDate}_to_${dateRange.endDate}`
                          : `employees_comprehensive_report_${dateRange.startDate}_to_${dateRange.endDate}`;
                      }
                      
                      exportToExcel(reportData, filename, headers);
                      
                      toast({
                        title: "Excel Export Complete",
                        description: `Generated ${selectedReportType === 'all' ? 'comprehensive' : selectedReportType} report with ${reportData.length} record(s)`,
                      });
                    }}
                    className="flex items-center"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => {
                      let reportData, headers, filename;
                      
                      if (selectedReportType === 'pending') {
                        ({ reportData, headers } = generatePendingRequestsReport());
                        filename = `pending_requests_${dateRange.startDate}_to_${dateRange.endDate}`;
                      } else if (selectedReportType === 'attendance') {
                        ({ reportData, headers } = generateAttendanceReport());
                        filename = `attendance_report_${dateRange.startDate}_to_${dateRange.endDate}`;
                      } else if (selectedReportType === 'opening') {
                        ({ reportData, headers } = generateLeaveBalanceReport('opening'));
                        filename = `opening_balance_${dateRange.startDate}_to_${dateRange.endDate}`;
                      } else if (selectedReportType === 'closing') {
                        ({ reportData, headers } = generateLeaveBalanceReport('closing'));
                        filename = `closing_balance_${dateRange.startDate}_to_${dateRange.endDate}`;
                      } else {
                        ({ reportData, headers } = generateComprehensiveReport());
                        filename = selectedEmployee !== 'all' 
                          ? `employee_detailed_report_${dateRange.startDate}_to_${dateRange.endDate}`
                          : `employees_comprehensive_report_${dateRange.startDate}_to_${dateRange.endDate}`;
                      }
                      
                      exportToPDF(reportData, filename, headers);
                      
                      toast({
                        title: "PDF Export Complete",
                        description: `Generated ${selectedReportType === 'all' ? 'comprehensive' : selectedReportType} report with ${reportData.length} record(s)`,
                      });
                    }}
                    className="flex items-center"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Report Preview based on selected type */}
          {selectedReportType !== 'all' && (
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      {selectedReportType === 'pending' && <Clock className="w-5 h-5 mr-2 text-orange-600" />}
                      {selectedReportType === 'attendance' && <Calendar className="w-5 h-5 mr-2 text-blue-600" />}
                      {selectedReportType === 'opening' && <TrendingUp className="w-5 h-5 mr-2 text-green-600" />}
                      {selectedReportType === 'closing' && <Target className="w-5 h-5 mr-2 text-purple-600" />}
                      <span>
                        {selectedReportType === 'pending' && 'Pending Requests Preview'}
                        {selectedReportType === 'attendance' && 'Day-wise Attendance Preview'}
                        {selectedReportType === 'opening' && 'Opening Balance Preview'}
                        {selectedReportType === 'closing' && 'Closing Balance Preview'}
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Preview Content */}
                    {selectedReportType === 'pending' && (() => {
                      const { reportData } = generatePendingRequestsReport();
                      const previewData = reportData.slice(0, 3);
                      return (
                        <div>
                          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                            <p className="text-orange-800 dark:text-orange-200 font-medium">Total: {reportData.length} pending requests found</p>
                            <p className="text-sm text-orange-600 dark:text-orange-300">Showing preview of first 3 records</p>
                          </div>
                          {previewData.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse border border-border">
                                <thead>
                                  <tr className="bg-muted">
                                    <th className="border border-border p-2 text-left">Employee</th>
                                    <th className="border border-border p-2 text-left">Department</th>
                                    <th className="border border-border p-2 text-left">Leave Type</th>
                                    <th className="border border-border p-2 text-left">Duration</th>
                                    <th className="border border-border p-2 text-left">Days Pending</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {previewData.map((row, index) => (
                                    <tr key={index} className="hover:bg-muted/50">
                                      <td className="border border-border p-2">{row['Employee Name']}</td>
                                      <td className="border border-border p-2">{row['Department']}</td>
                                      <td className="border border-border p-2">
                                        <Badge variant="outline">{row['Leave Type']}</Badge>
                                      </td>
                                      <td className="border border-border p-2">{row['Start Date']} - {row['End Date']}</td>
                                      <td className="border border-border p-2">
                                        <Badge variant="destructive">{row['Days Pending']} days</Badge>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-center py-4">No pending requests found</p>
                          )}
                        </div>
                      );
                    })()}
                    
                    {selectedReportType === 'attendance' && (() => {
                      const { reportData } = generateAttendanceReport();
                      const previewData = reportData.slice(0, 3);
                      return (
                        <div>
                          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-blue-800 dark:text-blue-200 font-medium">Total: {reportData.length} attendance records found</p>
                            <p className="text-sm text-blue-600 dark:text-blue-300">Showing preview of first 3 records</p>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-border">
                              <thead>
                                <tr className="bg-muted">
                                  <th className="border border-border p-2 text-left">Date</th>
                                  <th className="border border-border p-2 text-left">Day</th>
                                  <th className="border border-border p-2 text-left">Present</th>
                                  <th className="border border-border p-2 text-left">On Leave</th>
                                  <th className="border border-border p-2 text-left">Attendance %</th>
                                </tr>
                              </thead>
                              <tbody>
                                {previewData.map((row, index) => (
                                  <tr key={index} className="hover:bg-muted/50">
                                    <td className="border border-border p-2">{row['Date']}</td>
                                    <td className="border border-border p-2">{row['Day']}</td>
                                    <td className="border border-border p-2">
                                      <Badge variant="default">{row['Present']}</Badge>
                                    </td>
                                    <td className="border border-border p-2">
                                      <Badge variant="outline">{row['Employees on Leave']}</Badge>
                                    </td>
                                    <td className="border border-border p-2">
                                      <Badge variant={row['Attendance %'] >= 90 ? 'default' : 'destructive'}>
                                        {row['Attendance %']}%
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                    
                    {selectedReportType === 'opening' && (() => {
                      const { reportData } = generateLeaveBalanceReport('opening');
                      const previewData = reportData.slice(0, 3);
                      return (
                        <div>
                          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-green-800 dark:text-green-200 font-medium">Total: {reportData.length} employee records found</p>
                            <p className="text-sm text-green-600 dark:text-green-300">Showing preview of first 3 records</p>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-border">
                              <thead>
                                <tr className="bg-muted">
                                  <th className="border border-border p-2 text-left">Employee</th>
                                  <th className="border border-border p-2 text-left">Department</th>
                                  <th className="border border-border p-2 text-left">Earned Leave</th>
                                  <th className="border border-border p-2 text-left">Sick Leave</th>
                                  <th className="border border-border p-2 text-left">Casual Leave</th>
                                </tr>
                              </thead>
                              <tbody>
                                {previewData.map((row, index) => (
                                  <tr key={index} className="hover:bg-muted/50">
                                    <td className="border border-border p-2">{row['Employee Name']}</td>
                                    <td className="border border-border p-2">{row['Department']}</td>
                                    <td className="border border-border p-2">
                                      <Badge variant="default">{row['Earned Leave - Opening']}</Badge>
                                    </td>
                                    <td className="border border-border p-2">
                                      <Badge variant="secondary">{row['Sick Leave - Opening']}</Badge>
                                    </td>
                                    <td className="border border-border p-2">
                                      <Badge variant="outline">{row['Casual Leave - Opening']}</Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                    
                    {selectedReportType === 'closing' && (() => {
                      const { reportData } = generateLeaveBalanceReport('closing');
                      const previewData = reportData.slice(0, 3);
                      return (
                        <div>
                          <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                            <p className="text-purple-800 dark:text-purple-200 font-medium">Total: {reportData.length} employee records found</p>
                            <p className="text-sm text-purple-600 dark:text-purple-300">Showing preview of first 3 records</p>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-border">
                              <thead>
                                <tr className="bg-muted">
                                  <th className="border border-border p-2 text-left">Employee</th>
                                  <th className="border border-border p-2 text-left">Department</th>
                                  <th className="border border-border p-2 text-left">Earned Remaining</th>
                                  <th className="border border-border p-2 text-left">Sick Remaining</th>
                                  <th className="border border-border p-2 text-left">Casual Remaining</th>
                                </tr>
                              </thead>
                              <tbody>
                                {previewData.map((row, index) => (
                                  <tr key={index} className="hover:bg-muted/50">
                                    <td className="border border-border p-2">{row['Employee Name']}</td>
                                    <td className="border border-border p-2">{row['Department']}</td>
                                    <td className="border border-border p-2">
                                      <Badge variant="default">{row['Earned Leave - Balance']}</Badge>
                                    </td>
                                    <td className="border border-border p-2">
                                      <Badge variant="secondary">{row['Sick Leave - Balance']}</Badge>
                                    </td>
                                    <td className="border border-border p-2">
                                      <Badge variant="outline">{row['Casual Leave - Balance']}</Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Summary Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
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