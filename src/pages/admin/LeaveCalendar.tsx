import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, User, CalendarDays, Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/services/api';

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  leaveType: 'sick' | 'casual' | 'earned' | 'compensation';
  status: 'pending' | 'approved' | 'rejected';
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    department: {
      name: string;
    };
  };
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  approvedAt?: string;
  reason?: string;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  isRecurring: boolean;
  isActive: boolean;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: {
    id: string;
    name: string;
  };
}

const LeaveCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAddLeaveDialogOpen, setIsAddLeaveDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditLeaveDialogOpen, setIsEditLeaveDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [isProcessingApproval, setIsProcessingApproval] = useState<string | null>(null);
  const { toast } = useToast();

  // Helper function to format date for input fields without timezone issues
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    leaveType: 'sick' as 'sick' | 'casual' | 'earned' | 'compensation',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    reason: '',
  });

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    fetchLeaveData();
    fetchHolidays();
    fetchEmployees();
  }, [currentMonth, currentYear]);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getLeaveCalendar(currentMonth + 1, currentYear);
      setLeaveRequests(response || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch leave data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidays = async () => {
    try {
      const response = await adminAPI.getHolidays(currentYear, true);
      setHolidays(response || []);
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await adminAPI.getEmployees(1, 100);
      setEmployees(response.employees || response.data?.employees || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const isDateDisabled = (day: number) => {
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = new Date(dateString);
    
    // Disable weekends (Saturday = 6, Sunday = 0)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return true;
    
    // Disable holidays
    const isHoliday = holidays.some(holiday => {
      const holidayDate = formatDateForInput(new Date(holiday.date));
      return holidayDate === dateString;
    });
    if (isHoliday) return true;
    
    return false;
  };

  const handleDateClick = (day: number) => {
    // Prevent clicking on weekends or holidays
    if (isDateDisabled(day)) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(dateString);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidays.some(holiday => {
        const holidayDate = formatDateForInput(new Date(holiday.date));
        return holidayDate === dateString;
      });
      
      toast({
        title: "Date Not Available",
        description: `Cannot create leave on ${isWeekend ? 'weekends' : 'holidays'}. Please select a working day.`,
        variant: "destructive",
      });
      return;
    }
    
    const clickedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // Create date object using the local timezone to avoid timezone conversion issues
    const clickedDateObject = new Date(currentYear, currentMonth, day);
    setSelectedDate(clickedDate);
    setLeaveForm({
      ...leaveForm,
      startDate: clickedDateObject,
      endDate: clickedDateObject,
    });
    setIsAddLeaveDialogOpen(true);
  };

  const validateLeaveDate = (dateString: string) => {
    const date = new Date(dateString);
    const dayOfWeek = date.getDay();
    
    // Check weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { isValid: false, reason: 'weekend' };
    }
    
    // Check holiday
    const isHoliday = holidays.some(holiday => {
      const holidayDate = formatDateForInput(new Date(holiday.date));
      return holidayDate === dateString;
    });
    
    if (isHoliday) {
      return { isValid: false, reason: 'holiday' };
    }
    
    return { isValid: true, reason: null };
  };

  const handleCreateLeave = async () => {
    if (!leaveForm.employeeId || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    // Convert dates to strings for validation and API
    const startDateString = leaveForm.startDate ? formatDateForInput(leaveForm.startDate) : '';
    const endDateString = leaveForm.endDate ? formatDateForInput(leaveForm.endDate) : '';
    
    // Validate start date
    const startDateValidation = validateLeaveDate(startDateString);
    if (!startDateValidation.isValid) {
      toast({
        title: "Invalid Start Date",
        description: `Cannot create leave on ${startDateValidation.reason}s. Please select a working day.`,
        variant: "destructive",
      });
      return;
    }
    
    // Validate end date
    const endDateValidation = validateLeaveDate(endDateString);
    if (!endDateValidation.isValid) {
      toast({
        title: "Invalid End Date",
        description: `Cannot create leave on ${endDateValidation.reason}s. Please select a working day.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await adminAPI.createLeaveForEmployee({
        employeeId: leaveForm.employeeId,
        leaveType: leaveForm.leaveType,
        startDate: startDateString,
        endDate: endDateString,
        reason: leaveForm.reason,
      });

      toast({
        title: "Success",
        description: "Leave created successfully",
      });

      // Reset form and close dialog
      resetLeaveForm();
      setIsAddLeaveDialogOpen(false);
      
      // Refresh leave data
      fetchLeaveData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create leave",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetLeaveForm = () => {
    setLeaveForm({
      employeeId: '',
      leaveType: 'sick',
      startDate: undefined,
      endDate: undefined,
      reason: '',
    });
    setSelectedDate('');
  };

  const handleEditLeave = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setLeaveForm({
      employeeId: leave.employee.id,
      leaveType: leave.leaveType,
      startDate: new Date(leave.startDate),
      endDate: new Date(leave.endDate),
      reason: leave.reason || '',
    });
    setIsEditLeaveDialogOpen(true);
  };

  const handleUpdateLeave = async () => {
    if (!selectedLeave || !leaveForm.leaveType || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    // Convert dates to strings for validation and API
    const startDateString = leaveForm.startDate ? formatDateForInput(leaveForm.startDate) : '';
    const endDateString = leaveForm.endDate ? formatDateForInput(leaveForm.endDate) : '';
    
    // Validate start date
    const startDateValidation = validateLeaveDate(startDateString);
    if (!startDateValidation.isValid) {
      toast({
        title: "Invalid Start Date",
        description: `Cannot update leave to ${startDateValidation.reason}s. Please select a working day.`,
        variant: "destructive",
      });
      return;
    }
    
    // Validate end date
    const endDateValidation = validateLeaveDate(endDateString);
    if (!endDateValidation.isValid) {
      toast({
        title: "Invalid End Date",
        description: `Cannot update leave to ${endDateValidation.reason}s. Please select a working day.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await adminAPI.updateLeaveRequest(selectedLeave.id, {
        leaveType: leaveForm.leaveType,
        startDate: startDateString,
        endDate: endDateString,
        reason: leaveForm.reason,
      });

      toast({
        title: "Success",
        description: "Leave updated successfully",
      });

      setIsEditLeaveDialogOpen(false);
      setSelectedLeave(null);
      resetLeaveForm();
      fetchLeaveData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update leave",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLeave = async (leaveId: string) => {
    if (!window.confirm('Are you sure you want to delete this leave request?')) {
      return;
    }

    try {
      await adminAPI.deleteLeaveRequest(leaveId);
      
      toast({
        title: "Success",
        description: "Leave deleted successfully",
      });
      
      fetchLeaveData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete leave",
        variant: "destructive",
      });
    }
  };

  const handleLeaveApproval = async (requestId: string, action: 'approved' | 'rejected') => {
    setIsProcessingApproval(requestId);
    
    try {
      if (action === 'approved') {
        await adminAPI.approveLeaveRequest(requestId, 'Approved by admin via calendar');
      } else {
        await adminAPI.rejectLeaveRequest(requestId, 'Rejected by admin via calendar');
      }

      toast({
        title: `Request ${action}`,
        description: `Leave request has been ${action} successfully.`,
      });

      // Refresh the leave data to show updated status
      fetchLeaveData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process the request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingApproval(null);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentMonth - 1);
    } else {
      newDate.setMonth(currentMonth + 1);
    }
    setCurrentDate(newDate);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getLeaveForDate = (day: number) => {
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return leaveRequests.filter(leave => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      const checkDate = new Date(dateString);
      
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  const getHolidaysForDate = (day: number) => {
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.filter(holiday => {
      const holidayDate = formatDateForInput(new Date(holiday.date));
      return holidayDate === dateString;
    });
  };

  const getLeaveTypeColor = (type: string, status: string) => {
    // Different opacity for different statuses
    const opacity = status === 'approved' ? '' : status === 'pending' ? 'opacity-70' : 'opacity-50';
    
    let baseColor = '';
    switch (type) {
      case 'sick':
        baseColor = 'bg-red-100 text-red-800 border-red-200';
        break;
      case 'casual':
        baseColor = 'bg-green-100 text-green-800 border-green-200';
        break;
      case 'earned':
        baseColor = 'bg-blue-100 text-blue-800 border-blue-200';
        break;
      case 'compensation':
        baseColor = 'bg-purple-100 text-purple-800 border-purple-200';
        break;
      default:
        baseColor = 'bg-gray-100 text-gray-800 border-gray-200';
    }
    
    // Add status indicator
    if (status === 'pending') {
      baseColor += ' border-dashed';
    } else if (status === 'rejected') {
      baseColor = 'bg-gray-100 text-gray-500 border-gray-300 line-through';
    }
    
    return `${baseColor} ${opacity}`;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = getDaysInMonth(currentDate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <CalendarDays className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leave Calendar</h1>
            <p className="text-muted-foreground">View and manage employee leaves - Click any date to add leave</p>
          </div>
        </div>
      </div>

      <Card className="shadow-professional-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 p-0 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-lg">
              {monthNames[currentMonth]} {currentYear}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 p-0 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center font-medium text-muted-foreground text-sm">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={index} className="p-2 h-24"></div>;
              }

              const leavesForDay = getLeaveForDate(day);
              const holidaysForDay = getHolidaysForDate(day);
              const isToday = day === new Date().getDate() && 
                            currentMonth === new Date().getMonth() && 
                            currentYear === new Date().getFullYear();
              const hasHoliday = holidaysForDay.length > 0;
              const isDisabled = isDateDisabled(day);
              const isWeekend = new Date(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`).getDay() % 6 === 0;

              return (
                <div
                  key={`${currentYear}-${currentMonth}-${day}`}
                  className={`p-2 h-24 border border-border rounded-lg overflow-hidden transition-colors ${
                    isDisabled 
                      ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-800 opacity-60'
                      : 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600'
                  } ${
                    isToday ? 'bg-primary/5 border-primary/20' : 
                    hasHoliday ? 'bg-red-50 border-red-200' : 
                    isWeekend ? 'bg-gray-50 dark:bg-gray-900 border-gray-300' :
                    'bg-background'
                  }`}
                  onClick={() => handleDateClick(day)}
                >
                  <div className={`text-sm font-medium mb-1 flex items-center justify-between ${
                    isToday ? 'text-primary' : 
                    isDisabled ? 'text-muted-foreground' : 
                    'text-foreground'
                  }`}>
                    <span>{day}</span>
                    {!isDisabled && <Plus className="h-3 w-3 opacity-50 hover:opacity-100" />}
                    {isWeekend && !hasHoliday && (
                      <span className="text-xs text-gray-500">Weekend</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {holidaysForDay.map((holiday, idx) => (
                      <div
                        key={`holiday-${holiday.id}-${idx}`}
                        className="text-xs p-1 rounded bg-red-100 border border-red-300 text-red-800 truncate"
                        title={`Holiday: ${holiday.name}${holiday.description ? ` - ${holiday.description}` : ''}`}
                      >
                        <div className="flex items-center space-x-1 truncate">
                          <Calendar className="h-2 w-2 flex-shrink-0" />
                          <span className="truncate font-medium">{holiday.name}</span>
                        </div>
                      </div>
                    ))}
                    {!hasHoliday && leavesForDay.slice(0, 2).map((leave, idx) => (
                      <div
                        key={`${leave.id}-${idx}`}
                        className={`text-xs p-1 rounded border ${getLeaveTypeColor(leave.leaveType, leave.status)} truncate cursor-pointer group hover:shadow-sm transition-shadow`}
                        title={`${leave.employee.firstName} ${leave.employee.lastName} - ${leave.leaveType} leave (${leave.status}) - Click to edit`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1 truncate">
                            <User className="h-2 w-2 flex-shrink-0" />
                            <span className="truncate">
                              {leave.employee.firstName} {leave.employee.lastName[0]}.
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditLeave(leave);
                              }}
                              className="hover:bg-white/20 p-0.5 rounded"
                              title="Edit leave"
                            >
                              <Edit className="h-2 w-2" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLeave(leave.id);
                              }}
                              className="hover:bg-white/20 p-0.5 rounded"
                              title="Delete leave"
                            >
                              <Trash2 className="h-2 w-2" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!hasHoliday && leavesForDay.length > 2 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{leavesForDay.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
              <span className="text-sm text-muted-foreground">Sick Leave</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
              <span className="text-sm text-muted-foreground">Casual Leave</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
              <span className="text-sm text-muted-foreground">Earned/Privilege Leave</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></div>
              <span className="text-sm text-muted-foreground">Compensation Off</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
              <span className="text-sm text-muted-foreground">Holidays</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 rounded"></div>
              <span className="text-sm text-muted-foreground">Weekends (Disabled)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Details Summary */}
      <Card className="shadow-professional-md">
        <CardHeader>
          <CardTitle className="text-lg">Pending Approvals for {monthNames[currentMonth]} {currentYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Clock className="h-6 w-6 animate-spin mr-2" />
              <span>Loading leave data...</span>
            </div>
          ) : leaveRequests.filter(leave => leave.status === 'pending').length > 0 ? (
            <div className="space-y-4">
              {/* Group pending requests by approver */}
              {Object.entries(
                leaveRequests
                  .filter(leave => leave.status === 'pending')
                  .reduce((groups, leave) => {
                    const approverKey = leave.approver 
                      ? `${leave.approver.firstName} ${leave.approver.lastName}`
                      : 'No approver assigned';
                    if (!groups[approverKey]) {
                      groups[approverKey] = [];
                    }
                    groups[approverKey].push(leave);
                    return groups;
                  }, {} as Record<string, LeaveRequest[]>)
              ).map(([approverName, requests]) => (
                <div key={approverName} className="border border-border rounded-lg p-4 bg-secondary/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {approverName === 'No approver assigned' ? '?' : approverName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{approverName}</p>
                        <p className="text-sm text-muted-foreground">{requests.length} pending approval{requests.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {requests.map((leave) => (
                      <div
                        key={leave.id}
                        className="flex items-center justify-between p-3 border border-border/50 rounded-lg bg-background/50"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-foreground font-medium text-xs">
                            {leave.employee.firstName[0]}{leave.employee.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {leave.employee.firstName} {leave.employee.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {leave.employee.department.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className={getLeaveTypeColor(leave.leaveType, leave.status)}>
                            {leave.leaveType}
                          </Badge>
                          <div className="text-right">
                            <p className="text-xs font-medium text-foreground">
                              {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              onClick={() => handleLeaveApproval(leave.id, 'approved')}
                              disabled={isProcessingApproval === leave.id}
                              size="sm"
                              className="bg-gradient-success hover:opacity-90 h-7 px-2"
                            >
                              {isProcessingApproval === leave.id ? (
                                <Clock className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              onClick={() => handleLeaveApproval(leave.id, 'rejected')}
                              disabled={isProcessingApproval === leave.id}
                              variant="destructive"
                              size="sm"
                              className="h-7 px-2"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p>No pending approvals for this month</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Leave Dialog */}
      <Dialog open={isAddLeaveDialogOpen} onOpenChange={setIsAddLeaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Leave for {selectedDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="employee">Employee *</Label>
              <Select 
                value={leaveForm.employeeId} 
                onValueChange={(value) => setLeaveForm({...leaveForm, employeeId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - {employee.department?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="leaveType">Leave Type *</Label>
              <Select 
                value={leaveForm.leaveType} 
                onValueChange={(value: 'sick' | 'casual' | 'earned' | 'compensation') => setLeaveForm({...leaveForm, leaveType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="casual">Casual Leave</SelectItem>
                  <SelectItem value="earned">Earned/Privilege Leave</SelectItem>
                  <SelectItem value="compensation">Compensation Off</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  type="date"
                  id="startDate"
                  value={leaveForm.startDate ? formatDateForInput(leaveForm.startDate) : ''}
                  onChange={(e) => setLeaveForm({...leaveForm, startDate: e.target.value ? new Date(e.target.value) : undefined})}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  type="date"
                  id="endDate"
                  value={leaveForm.endDate ? formatDateForInput(leaveForm.endDate) : ''}
                  onChange={(e) => setLeaveForm({...leaveForm, endDate: e.target.value ? new Date(e.target.value) : undefined})}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for leave"
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline"
                onClick={() => {
                  resetLeaveForm();
                  setIsAddLeaveDialogOpen(false);
                }}
                disabled={isSubmitting}
                className="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateLeave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Leave'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Leave Dialog */}
      <Dialog open={isEditLeaveDialogOpen} onOpenChange={setIsEditLeaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Leave Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editEmployee">Employee</Label>
              <Select 
                value={leaveForm.employeeId} 
                onValueChange={(value) => setLeaveForm({...leaveForm, employeeId: value})}
                disabled
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - {employee.department?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="editLeaveType">Leave Type *</Label>
              <Select 
                value={leaveForm.leaveType} 
                onValueChange={(value: 'sick' | 'casual' | 'earned' | 'compensation') => setLeaveForm({...leaveForm, leaveType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="casual">Casual Leave</SelectItem>
                  <SelectItem value="earned">Earned/Privilege Leave</SelectItem>
                  <SelectItem value="compensation">Compensation Off</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editStartDate">Start Date *</Label>
                <Input
                  type="date"
                  id="editStartDate"
                  value={leaveForm.startDate ? formatDateForInput(leaveForm.startDate) : ''}
                  onChange={(e) => setLeaveForm({...leaveForm, startDate: e.target.value ? new Date(e.target.value) : undefined})}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="editEndDate">End Date *</Label>
                <Input
                  type="date"
                  id="editEndDate"
                  value={leaveForm.endDate ? formatDateForInput(leaveForm.endDate) : ''}
                  onChange={(e) => setLeaveForm({...leaveForm, endDate: e.target.value ? new Date(e.target.value) : undefined})}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="editReason">Reason *</Label>
              <Textarea
                id="editReason"
                placeholder="Enter reason for leave"
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                onClick={() => {
                  setIsEditLeaveDialogOpen(false);
                  setSelectedLeave(null);
                  resetLeaveForm();
                }}
                disabled={isSubmitting}
                className="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateLeave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Leave'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveCalendar;