import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, User, CalendarDays, Plus, Edit, Trash2, Check, X, BarChart3, Heart, Sun, Gift, TrendingUp, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TailwindDatePicker } from '@/components/ui/tailwind-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/services/api';
import { TimeManagementBackground } from '@/components/ui/time-management-background';

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
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leaveToDelete, setLeaveToDelete] = useState<LeaveRequest | null>(null);
  const [isDeletingLeave, setIsDeletingLeave] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [hoveredLeave, setHoveredLeave] = useState<LeaveRequest | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isDayLeavesDialogOpen, setIsDayLeavesDialogOpen] = useState(false);
  const [selectedDayLeaves, setSelectedDayLeaves] = useState<{date: string, leaves: LeaveRequest[]} | null>(null);
  const { toast } = useToast();

  // Helper function to format date for input fields without timezone issues
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to format duration display
  const formatDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const end = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    // If it's the same date, show only once
    if (start === end) {
      return start;
    }
    
    return `${start} - ${end}`;
  };

  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    leaveType: 'sick' as 'sick' | 'casual' | 'earned' | 'compensation' | 'half-sick' | 'half-casual' | 'half-earned',
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
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const leavesForDay = getLeaveForDate(day);

    // Check if there's a holiday on this date first
    const holidayOnDate = holidays.find(holiday => {
      const holidayDate = formatDateForInput(new Date(holiday.date));
      return holidayDate === dateString;
    });

    if (holidayOnDate) {
      // Show holiday details popup
      setSelectedHoliday(holidayOnDate);
      setIsHolidayDialogOpen(true);
      return;
    }

    // If there are leaves on this day, show the leaves popup
    if (leavesForDay.length > 0) {
      const formattedDate = new Date(currentYear, currentMonth, day).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      setSelectedDayLeaves({
        date: formattedDate,
        leaves: leavesForDay
      });
      setIsDayLeavesDialogOpen(true);
      return;
    }

    // If no leaves and it's a working day, open add leave dialog
    if (!isDateDisabled(day)) {
      // Create date object using the local timezone to avoid timezone conversion issues
      const clickedDateObject = new Date(currentYear, currentMonth, day);
      setSelectedDate(dateString);
      setLeaveForm({
        ...leaveForm,
        startDate: clickedDateObject,
        endDate: clickedDateObject,
      });
      setIsAddLeaveDialogOpen(true);
      return;
    }

    // If it's a disabled date (weekend/holiday), show info
    const date = new Date(dateString);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    toast({
      title: "Date Not Available",
      description: `Cannot create leave on ${isWeekend ? 'weekends' : 'holidays'}. Please select a working day.`,
      variant: "destructive",
    });
  };

  const handleAddLeaveClick = (day: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the date click

    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Prevent clicking on weekends/holidays
    if (isDateDisabled(day)) {
      const date = new Date(dateString);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      toast({
        title: "Date Not Available",
        description: `Cannot create leave on ${isWeekend ? 'weekends' : 'holidays'}. Please select a working day.`,
        variant: "destructive",
      });
      return;
    }

    // Create date object using the local timezone to avoid timezone conversion issues
    const clickedDateObject = new Date(currentYear, currentMonth, day);
    setSelectedDate(dateString);
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
    
    const isHalfDay = leaveForm.leaveType.startsWith('half-');
    
    // For half-day leaves, start date and end date must be the same
    if (isHalfDay && leaveForm.startDate?.getTime() !== leaveForm.endDate?.getTime()) {
      toast({
        title: "Invalid Date Range",
        description: "Half-day leaves can only be created for a single day.",
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
      const baseLeaveType = isHalfDay ? leaveForm.leaveType.replace('half-', '') : leaveForm.leaveType;
      
      await adminAPI.createLeaveForEmployee({
        employeeId: leaveForm.employeeId,
        leaveType: baseLeaveType,
        startDate: startDateString,
        endDate: endDateString,
        reason: leaveForm.reason,
        isHalfDay: isHalfDay,
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

  const handleDeleteLeaveClick = (leave: LeaveRequest) => {
    setLeaveToDelete(leave);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteLeave = async () => {
    if (!leaveToDelete) return;

    try {
      setIsDeletingLeave(true);
      await adminAPI.deleteLeaveRequest(leaveToDelete.id);
      
      toast({
        title: "Success",
        description: "Leave deleted successfully",
      });
      
      setIsDeleteDialogOpen(false);
      setLeaveToDelete(null);
      fetchLeaveData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete leave",
        variant: "destructive",
      });
    } finally {
      setIsDeletingLeave(false);
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

  const navigationLockRef = useRef(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    if (navigationLockRef.current) {
      console.log('Navigation blocked - lock active');
      return;
    }
    
    navigationLockRef.current = true;
    setIsNavigating(true);
    console.log(`Navigation lock acquired for ${direction}`);
    
    setCurrentDate(prevDate => {
      const currentMonthNum = prevDate.getMonth();
      const currentYear = prevDate.getFullYear();
      
      console.log(`Navigate ${direction}: from ${currentMonthNum}/${currentYear}`);
      
      // Create new date with explicit month calculation
      const targetMonth = direction === 'prev' ? currentMonthNum - 1 : currentMonthNum + 1;
      console.log(`Target month calculation: ${currentMonthNum} ${direction === 'prev' ? '-' : '+'} 1 = ${targetMonth}`);
      
      const newDate = new Date(currentYear, targetMonth, 1);
      
      console.log(`Navigate ${direction}: to ${newDate.getMonth()}/${newDate.getFullYear()}`);
      console.log(`New date object created:`, newDate.toString());
      
      // Release lock after state update
      setTimeout(() => {
        navigationLockRef.current = false;
        setIsNavigating(false);
        console.log('Navigation lock released');
      }, 200);
      
      return newDate;
    });
  }, []);

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
    const checkDate = new Date(dateString);
    
    // Don't show leave on weekends since they don't count as leave days
    const dayOfWeek = checkDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return [];
    }
    
    return leaveRequests.filter(leave => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      
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

  // Calculate monthly statistics
  const monthlyStats = {
    totalRequests: leaveRequests.length,
    pendingApprovals: leaveRequests.filter(req => req.status === 'pending').length,
    approvedLeaves: leaveRequests.filter(req => req.status === 'approved').length,
    rejectedLeaves: leaveRequests.filter(req => req.status === 'rejected').length
  };

  // Filter handler for legend items
  const toggleFilter = (leaveType: string) => {
    setActiveFilters(prev => 
      prev.includes(leaveType) 
        ? prev.filter(type => type !== leaveType)
        : [...prev, leaveType]
    );
  };

  // Enhanced leave display with filtering
  const getFilteredLeaves = (leavesForDay: LeaveRequest[]) => {
    if (activeFilters.length === 0) return leavesForDay;
    return leavesForDay.filter(leave => activeFilters.includes(leave.leaveType));
  };

  // Tooltip handlers
  const handleLeaveHover = (event: React.MouseEvent, leave: LeaveRequest) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({ 
      x: rect.left + rect.width / 2, 
      y: rect.top - 60 // Better positioned above the leave entry but not too far
    });
    setHoveredLeave(leave);
  };

  const handleLeaveLeave = () => {
    setHoveredLeave(null);
  };

  return (
    <div className="relative min-h-screen">
      <TimeManagementBackground />
      <div className="relative z-10 space-y-6">
        {/* Hero Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Leave Calendar</h1>
              <p className="text-muted-foreground mt-1 text-sm">View and manage employee leaves - Click any date to add leave</p>
            </div>
          </div>
        </div>

        {/* Quick Insights Panel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{monthlyStats.totalRequests}</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Total Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/50 border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{monthlyStats.pendingApprovals}</p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">Pending Approvals</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{monthlyStats.approvedLeaves}</p>
                  <p className="text-sm text-green-600 dark:text-green-400">Approved Leaves</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <X className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">{monthlyStats.rejectedLeaves}</p>
                  <p className="text-sm text-red-600 dark:text-red-400">Rejected Leaves</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-blue-950/20 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
              disabled={isNavigating}
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
              onClick={() => {
                console.log('Next button clicked, lock state:', navigationLockRef.current);
                navigateMonth('next');
              }}
              disabled={isNavigating}
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
                  className={`p-2 h-24 border rounded-lg overflow-hidden transition-colors ${
                    isToday
                      ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/20'
                      : isDisabled
                        ? hasHoliday
                          ? 'cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-600 bg-red-50 border-red-200'
                          : 'cursor-not-allowed bg-gray-100 dark:bg-gray-800 opacity-60 border-border'
                        : 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 border-border'
                  } ${
                    !isToday && hasHoliday ? 'bg-red-50 border-red-200' :
                    !isToday && isWeekend ? 'bg-gray-100/80 dark:bg-gray-800/80 border-gray-300/60' :
                    !isToday ? 'bg-background border-border' : ''
                  }`}
                  onClick={() => handleDateClick(day)}
                >
                  <div className={`text-sm font-medium mb-1 flex items-center justify-between ${
                    isToday ? 'text-primary' : 
                    isDisabled ? 'text-muted-foreground' : 
                    'text-foreground'
                  }`}>
                    <span>{day}</span>
                    {!isDisabled && !hasHoliday && !isWeekend && (
                      <div
                        className="w-6 h-6 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors duration-200 group cursor-pointer"
                        onClick={(e) => handleAddLeaveClick(day, e)}
                        title="Add leave for this date"
                      >
                        <Plus className="h-3 w-3 text-blue-600 dark:text-blue-400 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" />
                      </div>
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
                    {/* Show weekend badge if it's weekend and no holiday */}
                    {!hasHoliday && isWeekend && (
                      <div className="flex items-center justify-center">
                        <Badge className="text-xs px-2 py-1 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 border border-gray-300 rounded-full font-medium">
                          <span className="mr-1">🛏️</span>
                          Weekend
                        </Badge>
                      </div>
                    )}
                    
                    {!hasHoliday && !isWeekend && (() => {
                      const filteredLeaves = getFilteredLeaves(leavesForDay);
                      const leaveTypeIcons = {
                        'sick': Heart,
                        'casual': Sun,
                        'earned': Gift,
                        'compensation': Calendar
                      };
                      const leaveTypeLabels = {
                        'sick': 'Sick Leave',
                        'casual': 'Casual Leave',
                        'earned': 'Earned/Privilege Leave',
                        'compensation': 'Compensation Off'
                      };

                      if (filteredLeaves.length === 0) return null;

                      if (filteredLeaves.length === 1) {
                        const leave = filteredLeaves[0];
                        const LeaveIcon = leaveTypeIcons[leave.leaveType] || User;

                        return (
                          <div
                            key={leave.id}
                            className={`text-xs px-2 py-1.5 rounded-full border ${getLeaveTypeColor(leave.leaveType, leave.status)} truncate cursor-pointer group hover:shadow-md transition-all duration-200 hover:scale-105`}
                            onMouseEnter={(e) => handleLeaveHover(e, leave)}
                            onMouseLeave={handleLeaveLeave}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditLeave(leave);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1 truncate">
                                <LeaveIcon className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate font-medium">
                                  {leave.isHalfDay ? `Half ${leaveTypeLabels[leave.leaveType]}` : leaveTypeLabels[leave.leaveType]}
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
                                    handleDeleteLeaveClick(leave);
                                  }}
                                  className="hover:bg-white/20 p-0.5 rounded"
                                  title="Delete leave"
                                >
                                  <Trash2 className="h-2 w-2" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Multiple leaves - show first one + count indicator
                      const firstLeave = filteredLeaves[0];
                      const LeaveIcon = leaveTypeIcons[firstLeave.leaveType] || User;

                      return (
                        <div className="space-y-1">
                          <div
                            key={firstLeave.id}
                            className={`text-xs px-2 py-1.5 rounded-full border ${getLeaveTypeColor(firstLeave.leaveType, firstLeave.status)} truncate cursor-pointer group hover:shadow-md transition-all duration-200 hover:scale-105`}
                            onMouseEnter={(e) => handleLeaveHover(e, firstLeave)}
                            onMouseLeave={handleLeaveLeave}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditLeave(firstLeave);
                            }}
                          >
                            <div className="flex items-center space-x-1 truncate">
                              <LeaveIcon className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate font-medium">
                                {firstLeave.isHalfDay ? `Half ${leaveTypeLabels[firstLeave.leaveType]}` : leaveTypeLabels[firstLeave.leaveType]}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-center text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20 rounded-md py-1 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors">
                            +{filteredLeaves.length - 1} more
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mr-4">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters:</span>
            </div>
            
            <button
              onClick={() => toggleFilter('sick')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all duration-200 hover:shadow-md ${
                activeFilters.includes('sick') 
                  ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 shadow-sm' 
                  : 'bg-white dark:bg-gray-800 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
              }`}
            >
              <Heart className="h-3 w-3" />
              <span className="text-sm font-medium">Sick Leave</span>
            </button>
            
            <button
              onClick={() => toggleFilter('casual')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all duration-200 hover:shadow-md ${
                activeFilters.includes('casual') 
                  ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300 shadow-sm' 
                  : 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
              }`}
            >
              <Sun className="h-3 w-3" />
              <span className="text-sm font-medium">Casual Leave</span>
            </button>
            
            <button
              onClick={() => toggleFilter('earned')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all duration-200 hover:shadow-md ${
                activeFilters.includes('earned') 
                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 shadow-sm' 
                  : 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}
            >
              <Gift className="h-3 w-3" />
              <span className="text-sm font-medium">Earned/Privilege Leave</span>
            </button>
            
            <button
              onClick={() => toggleFilter('compensation')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all duration-200 hover:shadow-md ${
                activeFilters.includes('compensation') 
                  ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300 shadow-sm' 
                  : 'bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
              }`}
            >
              <Calendar className="h-3 w-3" />
              <span className="text-sm font-medium">Compensation Off</span>
            </button>

            {activeFilters.length > 0 && (
              <button
                onClick={() => setActiveFilters([])}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm transition-colors duration-200"
              >
                <X className="h-3 w-3" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leave Details Summary */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-purple-950/20 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Pending Approvals for {monthNames[currentMonth]} {currentYear}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Review and approve leave requests</p>
            </div>
          </div>
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
                        className="flex items-center justify-between p-4 border border-purple-200/50 rounded-xl bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-800 dark:to-purple-950/20 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                            {leave.employee.firstName[0]}{leave.employee.lastName[0]}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">
                              {leave.employee.firstName} {leave.employee.lastName}
                            </p>
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                              {leave.employee.department.name} • {leave.employee.position || 'Employee'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <div className="flex items-center space-x-2 mb-1">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                                leave.leaveType === 'sick' ? 'bg-red-100' :
                                leave.leaveType === 'casual' ? 'bg-green-100' :
                                leave.leaveType === 'earned' ? 'bg-blue-100' : 'bg-purple-100'
                              }`}>
                                {leave.leaveType === 'sick' && <Heart className="h-3 w-3 text-red-600" />}
                                {leave.leaveType === 'casual' && <Sun className="h-3 w-3 text-green-600" />}
                                {leave.leaveType === 'earned' && <Gift className="h-3 w-3 text-blue-600" />}
                                {leave.leaveType === 'compensation' && <Calendar className="h-3 w-3 text-purple-600" />}
                              </div>
                              <Badge className={`${
                                leave.leaveType === 'sick' ? 'bg-red-100 text-red-700 border-red-200' :
                                leave.leaveType === 'casual' ? 'bg-green-100 text-green-700 border-green-200' :
                                leave.leaveType === 'earned' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                'bg-purple-100 text-purple-700 border-purple-200'
                              } px-3 py-1 rounded-full font-medium`}>
                                {leave.leaveType === 'sick' ? 'Sick Leave' :
                                 leave.leaveType === 'casual' ? 'Casual Leave' :
                                 leave.leaveType === 'earned' ? 'Earned/Privilege Leave' :
                                 'Compensation Off'}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-center bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-2">
                            <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">Duration</p>
                            <p className="text-sm font-bold text-foreground">
                              {formatDuration(leave.startDate, leave.endDate)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => handleLeaveApproval(leave.id, 'approved')}
                              disabled={isProcessingApproval === leave.id}
                              size="sm"
                              className="rounded-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-4"
                              title="Approve leave request"
                            >
                              {isProcessingApproval === leave.id ? (
                                <Clock className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Check className="h-3 w-3 mr-1" />
                              )}
                              <span className="text-xs">Approve</span>
                            </Button>
                            <Button
                              onClick={() => handleLeaveApproval(leave.id, 'rejected')}
                              disabled={isProcessingApproval === leave.id}
                              size="sm"
                              variant="outline"
                              className="rounded-full text-red-600 border-red-200 hover:bg-red-50 px-4"
                              title="Reject leave request"
                            >
                              <X className="h-3 w-3 mr-1" />
                              <span className="text-xs">Reject</span>
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
        <DialogContent 
          className="max-w-md"
          style={{ 
            borderRadius: '24px',
            border: 'none',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center text-lg">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mr-3">
                <CalendarDays className="h-4 w-4 text-white" />
              </div>
              Add Leave for {selectedDate}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              Fill out the details below to create a leave request for the selected employee.
            </DialogDescription>
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
                onValueChange={(value: 'sick' | 'casual' | 'earned' | 'compensation' | 'half-sick' | 'half-casual' | 'half-earned') => setLeaveForm({...leaveForm, leaveType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="casual">Casual Leave</SelectItem>
                  <SelectItem value="earned">Earned/Privilege Leave</SelectItem>
                  <SelectItem value="compensation">Compensation Off</SelectItem>
                  <SelectItem value="half-sick">Half Sick Leave</SelectItem>
                  <SelectItem value="half-casual">Half Casual Leave</SelectItem>
                  <SelectItem value="half-earned">Half Earned/Privilege Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <TailwindDatePicker
                  date={leaveForm.startDate}
                  onSelect={(date) => setLeaveForm({...leaveForm, startDate: date})}
                  placeholder="Select start date"
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <TailwindDatePicker
                  date={leaveForm.endDate}
                  onSelect={(date) => setLeaveForm({...leaveForm, endDate: date})}
                  placeholder="Select end date"
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
                className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white rounded-full"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateLeave}
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full"
              >
                {isSubmitting ? (
                  <>
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Create Leave
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Leave Dialog */}
      <Dialog open={isEditLeaveDialogOpen} onOpenChange={setIsEditLeaveDialogOpen}>
        <DialogContent 
          className="max-w-md"
          style={{ 
            borderRadius: '24px',
            border: 'none',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
        >
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
                onValueChange={(value: 'sick' | 'casual' | 'earned' | 'compensation' | 'half-sick' | 'half-casual' | 'half-earned') => setLeaveForm({...leaveForm, leaveType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="casual">Casual Leave</SelectItem>
                  <SelectItem value="earned">Earned/Privilege Leave</SelectItem>
                  <SelectItem value="compensation">Compensation Off</SelectItem>
                  <SelectItem value="half-sick">Half Sick Leave</SelectItem>
                  <SelectItem value="half-casual">Half Casual Leave</SelectItem>
                  <SelectItem value="half-earned">Half Earned/Privilege Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editStartDate">Start Date *</Label>
                <TailwindDatePicker
                  date={leaveForm.startDate}
                  onSelect={(date) => setLeaveForm({...leaveForm, startDate: date})}
                  placeholder="Select start date"
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="editEndDate">End Date *</Label>
                <TailwindDatePicker
                  date={leaveForm.endDate}
                  onSelect={(date) => setLeaveForm({...leaveForm, endDate: date})}
                  placeholder="Select end date"
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
                variant="outline"
                onClick={() => {
                  setIsEditLeaveDialogOpen(false);
                  setSelectedLeave(null);
                  resetLeaveForm();
                }}
                disabled={isSubmitting}
                className="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white rounded-full"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateLeave}
                disabled={isSubmitting}
                className="rounded-full"
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

      {/* Day Leaves Dialog */}
      <Dialog open={isDayLeavesDialogOpen} onOpenChange={setIsDayLeavesDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[80vh]"
          style={{
            borderRadius: '16px',
            border: 'none',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <span>Leaves on {selectedDayLeaves?.date}</span>
            </DialogTitle>
            <DialogDescription>
              {selectedDayLeaves?.leaves.length} leave{selectedDayLeaves?.leaves.length !== 1 ? 's' : ''} scheduled for this day
            </DialogDescription>
          </DialogHeader>

          {selectedDayLeaves && (
            <div className="py-4">
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {selectedDayLeaves.leaves.map((leave, index) => {
                  const leaveTypeIcons = {
                    'sick': Heart,
                    'casual': Sun,
                    'earned': Gift,
                    'compensation': Calendar
                  };
                  const LeaveIcon = leaveTypeIcons[leave.leaveType] || User;
                  const leaveTypeLabels = {
                    'sick': 'Sick Leave',
                    'casual': 'Casual Leave',
                    'earned': 'Earned/Privilege Leave',
                    'compensation': 'Compensation Off'
                  };

                  return (
                    <div
                      key={leave.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-700/50 hover:shadow-md transition-all duration-200 cursor-pointer"
                      onClick={() => {
                        setIsDayLeavesDialogOpen(false);
                        handleEditLeave(leave);
                      }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md flex-shrink-0">
                          {leave.employee.firstName[0]}{leave.employee.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                              {leave.employee.firstName} {leave.employee.lastName}
                            </p>
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs border font-medium ${getLeaveTypeColor(leave.leaveType, leave.status)}`}>
                              <LeaveIcon className="h-3 w-3 mr-1" />
                              {leave.isHalfDay ? `Half ${leaveTypeLabels[leave.leaveType]}` : leaveTypeLabels[leave.leaveType]}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            {leave.employee.department?.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Duration: {formatDuration(leave.startDate, leave.endDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                          leave.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          leave.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {leave.status === 'approved' && '✓'}
                          {leave.status === 'rejected' && '✗'}
                          {leave.status === 'pending' && '⏳'}
                          <span className="ml-1 capitalize">{leave.status}</span>
                        </div>
                        <div className="flex items-center space-x-1 opacity-60 hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsDayLeavesDialogOpen(false);
                              handleEditLeave(leave);
                            }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Edit leave"
                          >
                            <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsDayLeavesDialogOpen(false);
                              handleDeleteLeaveClick(leave);
                            }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Delete leave"
                          >
                            <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-600 mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Click any leave to edit • Use action buttons for quick operations
                </p>
                <Button
                  onClick={() => setIsDayLeavesDialogOpen(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Holiday Details Dialog */}
      <Dialog open={isHolidayDialogOpen} onOpenChange={setIsHolidayDialogOpen}>
        <DialogContent
          className="max-w-md"
          style={{
            borderRadius: '24px',
            border: 'none',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <span>Holiday Details</span>
            </DialogTitle>
          </DialogHeader>

          {selectedHoliday && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Holiday Name</Label>
                <div className="mt-1 text-lg font-medium text-foreground">
                  {selectedHoliday.name}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                <div className="mt-1 text-sm text-foreground">
                  {new Date(selectedHoliday.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>

              {selectedHoliday.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <div className="mt-1 text-sm text-foreground bg-orange-50 dark:bg-orange-950/50 p-3 rounded-md border border-orange-200 dark:border-orange-800">
                    {selectedHoliday.description}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200">
                    {selectedHoliday.isRecurring ? 'Recurring Holiday' : 'One-time Holiday'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={() => setIsHolidayDialogOpen(false)}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent 
          className="sm:max-w-md"
          style={{ 
            borderRadius: '24px',
            border: 'none',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              <span>Delete Leave Request</span>
            </DialogTitle>
          </DialogHeader>
          
          {leaveToDelete && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete the leave request for{' '}
                <span className="font-medium text-foreground">
                  {leaveToDelete.employee.firstName} {leaveToDelete.employee.lastName}
                </span>?
              </p>
              
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Leave Type:</span>
                  <span className="font-medium">{leaveToDelete.leaveType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Period:</span>
                  <span className="font-medium">
                    {new Date(leaveToDelete.startDate).toLocaleDateString()} - {new Date(leaveToDelete.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`font-medium ${
                    leaveToDelete.status === 'approved' ? 'text-green-600' : 
                    leaveToDelete.status === 'pending' ? 'text-yellow-600' : 
                    'text-red-600'
                  }`}>
                    {leaveToDelete.status}
                  </span>
                </div>
              </div>
              
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">
                  This action cannot be undone. The leave request will be permanently removed from the system.
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="flex-1 rounded-full"
                  disabled={isDeletingLeave}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteLeave}
                  disabled={isDeletingLeave}
                  variant="destructive"
                  className="flex-1 rounded-full"
                >
                  {isDeletingLeave ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Yes, Delete Request'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hover Tooltip */}
      {hoveredLeave && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs p-2 rounded-lg shadow-lg pointer-events-none"
          style={{
            left: tooltipPosition.x - 100,
            top: tooltipPosition.y - 120,
            maxWidth: '200px'
          }}
        >
          <div className="font-semibold mb-1">
            {hoveredLeave.employee.firstName} {hoveredLeave.employee.lastName}
          </div>
          <div className="text-gray-300 mb-1">
            {hoveredLeave.employee.department?.name} • {hoveredLeave.employee.position || 'Employee'}
          </div>
          <div className="mb-1">
            Leave Type: <span className="font-medium">{hoveredLeave.leaveType}</span>
          </div>
          <div className="mb-1">
            Duration: {formatDuration(hoveredLeave.startDate, hoveredLeave.endDate)}
          </div>
          <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
            hoveredLeave.status === 'approved' ? 'bg-green-100 text-green-800' :
            hoveredLeave.status === 'rejected' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {hoveredLeave.status === 'approved' && '🟢'}
            {hoveredLeave.status === 'rejected' && '🔴'}
            {hoveredLeave.status === 'pending' && '🟡'}
            <span className="ml-1 capitalize">{hoveredLeave.status}</span>
          </div>
          {hoveredLeave.approver && hoveredLeave.status !== 'pending' && (
            <div className="text-gray-400 text-xs mt-1">
              by {hoveredLeave.approver.firstName} {hoveredLeave.approver.lastName}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default LeaveCalendar;