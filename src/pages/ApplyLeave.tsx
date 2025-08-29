import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LeaveType } from '@/types';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  FileText, 
  CalendarDays,
  User,
  Plus,
  X
} from 'lucide-react';
import { leaveTypeLabels } from '@/data/mockData';
import { employeeAPI } from '@/services/api';

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  leaveType: 'sick' | 'casual' | 'earned' | 'compensation';
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
}

const ApplyLeave: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [existingLeaves, setExistingLeaves] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [isViewLeaveDialogOpen, setIsViewLeaveDialogOpen] = useState(false);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<LeaveRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [leaveForm, setLeaveForm] = useState({
    leaveType: '' as LeaveType | '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    fetchData();
  }, [currentMonth, currentYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch employee's existing leave requests for the current month/year
      const leaveResponse = await employeeAPI.getLeaveRequests(1, 100);
      // Filter out cancelled requests - they should not appear on calendar
      const activeLeaves = (leaveResponse.requests || []).filter(leave => leave.status !== 'cancelled');
      setExistingLeaves(activeLeaves);
      
      // Fetch holidays for the current year
      try {
        const holidaysResponse = await employeeAPI.getHolidays(currentYear);
        setHolidays(holidaysResponse.holidays || []);
      } catch (error) {
        console.warn('Failed to fetch holidays, proceeding without holiday data:', error);
        setHolidays([]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch calendar data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const formatDateString = (day: number) => {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isDateDisabled = (day: number) => {
    const dateString = formatDateString(day);
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Disable past dates
    if (date < today) return true;
    
    // Disable weekends (Saturday = 6, Sunday = 0)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return true;
    
    // Disable holidays
    const isHoliday = holidays.some(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.toDateString() === date.toDateString();
    });
    if (isHoliday) return true;
    
    // Check if there's already an approved/pending leave on this date
    const hasExistingLeave = existingLeaves.some(leave => {
      if (leave.status === 'rejected') return false;
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      return date >= startDate && date <= endDate;
    });
    
    return hasExistingLeave;
  };


  const hasLeaveOnDate = (day: number) => {
    const dateString = formatDateString(day);
    return existingLeaves.find(leave => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      const checkDate = new Date(dateString);
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  const isWeekend = (day: number) => {
    const date = new Date(formatDateString(day));
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const isHoliday = (day: number) => {
    const dateString = formatDateString(day);
    const date = new Date(dateString);
    return holidays.some(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.toDateString() === date.toDateString();
    });
  };

  const getHolidayOnDate = (day: number) => {
    const dateString = formatDateString(day);
    const date = new Date(dateString);
    return holidays.find(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.toDateString() === date.toDateString();
    });
  };

  const handleDateClick = (day: number) => {
    // Prevent clicking on weekends or holidays
    if (isDateDisabled(day)) {
      const dateString = formatDateString(day);
      const date = new Date(dateString);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidays.some(holiday => {
        const holidayDate = new Date(holiday.date).toISOString().split('T')[0];
        return holidayDate === dateString;
      });
      
      toast({
        title: "Date Not Available",
        description: `Cannot apply for leave on ${isWeekend ? 'weekends' : 'holidays'}. Please select a working day.`,
        variant: "destructive",
      });
      return;
    }
    
    const clickedDate = formatDateString(day);
    setSelectedDate(clickedDate);
    setLeaveForm({
      ...leaveForm,
      startDate: clickedDate,
      endDate: clickedDate,
    });
    setIsApplyDialogOpen(true);
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
      const holidayDate = new Date(holiday.date).toISOString().split('T')[0];
      return holidayDate === dateString;
    });
    
    if (isHoliday) {
      return { isValid: false, reason: 'holiday' };
    }
    
    return { isValid: true, reason: null };
  };

  const handleSubmit = async () => {
    if (!leaveForm.leaveType || !leaveForm.reason.trim() || !leaveForm.startDate || !leaveForm.endDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate start date
    const startDateValidation = validateLeaveDate(leaveForm.startDate);
    if (!startDateValidation.isValid) {
      toast({
        title: "Invalid Start Date",
        description: `Cannot apply for leave on ${startDateValidation.reason}s. Please select a working day.`,
        variant: "destructive",
      });
      return;
    }
    
    // Validate end date
    const endDateValidation = validateLeaveDate(leaveForm.endDate);
    if (!endDateValidation.isValid) {
      toast({
        title: "Invalid End Date",
        description: `Cannot apply for leave on ${endDateValidation.reason}s. Please select a working day.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await employeeAPI.createLeaveRequest({
        leaveType: leaveForm.leaveType as string,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason,
      });

      toast({
        title: "Leave Request Submitted",
        description: `Your ${leaveTypeLabels[leaveForm.leaveType as LeaveType]} request has been submitted for approval.`,
      });

      // Reset form and close dialog
      resetLeaveForm();
      setIsApplyDialogOpen(false);
      
      // Refresh data
      fetchData();
      
      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating leave request:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit leave request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetLeaveForm = () => {
    setLeaveForm({ leaveType: '', startDate: '', endDate: '', reason: '' });
    setSelectedDate('');
  };

  const handleLeaveClick = (leave: LeaveRequest) => {
    setSelectedLeaveRequest(leave);
    setIsViewLeaveDialogOpen(true);
  };

  const handleCancelLeave = async () => {
    if (!selectedLeaveRequest) return;

    // Only allow cancellation of pending requests
    if (selectedLeaveRequest.status !== 'pending') {
      toast({
        title: "Cannot Cancel",
        description: `Cannot cancel ${selectedLeaveRequest.status} leave requests.`,
        variant: "destructive",
      });
      return;
    }

    const confirmCancel = window.confirm(
      `Are you sure you want to cancel your ${leaveTypeLabels[selectedLeaveRequest.leaveType as LeaveType]} leave from ${new Date(selectedLeaveRequest.startDate).toLocaleDateString()} to ${new Date(selectedLeaveRequest.endDate).toLocaleDateString()}?`
    );

    if (!confirmCancel) return;

    setIsCancelling(true);

    try {
      await employeeAPI.cancelLeaveRequest(selectedLeaveRequest.id);

      toast({
        title: "Leave Request Cancelled",
        description: "Your leave request has been cancelled successfully.",
      });

      // Close dialog and refresh data
      setIsViewLeaveDialogOpen(false);
      setSelectedLeaveRequest(null);
      fetchData();
    } catch (error: any) {
      console.error('Error cancelling leave request:', error);
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel leave request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const getLeaveTypeColor = (type: string, status: string) => {
    const opacity = status === 'approved' ? '' : status === 'pending' ? 'opacity-70' : 'opacity-50';
    
    let baseColor = '';
    switch (type) {
      case 'sick':
        baseColor = 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800';
        break;
      case 'casual':
        baseColor = 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
        break;
      case 'earned':
        baseColor = 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800';
        break;
      case 'compensation':
        baseColor = 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800';
        break;
      default:
        baseColor = 'bg-muted text-muted-foreground border-border';
    }
    
    if (status === 'pending') {
      baseColor += ' border-dashed';
    } else if (status === 'rejected') {
      baseColor = 'bg-muted text-muted-foreground border-border line-through';
    }
    
    return `${baseColor} ${opacity}`;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = getDaysInMonth(currentDate);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <CalendarDays className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Apply for Leave</h1>
            <p className="text-muted-foreground">
              Click any working day to apply for leave
            </p>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <Card className="shadow-professional-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <CardTitle className="text-lg font-semibold">
              {monthNames[currentMonth]} {currentYear}
            </CardTitle>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {dayNames.map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={index} className="h-24 p-2"></div>;
              }
              
              const isDisabled = isDateDisabled(day);
              const leaveOnDate = hasLeaveOnDate(day);
              const isWeekendDate = isWeekend(day);
              const isHolidayDate = isHoliday(day);
              const holidayOnDate = getHolidayOnDate(day);
              
              return (
                <div
                  key={day}
                  className={`h-24 border border-border rounded-lg p-2 overflow-hidden transition-colors relative ${
                    isDisabled 
                      ? isWeekendDate
                        ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60'
                        : isHolidayDate
                        ? 'bg-orange-50 dark:bg-orange-950 cursor-not-allowed opacity-60'
                        : 'bg-muted/30 cursor-not-allowed opacity-60'
                      : 'cursor-pointer hover:bg-secondary/50'
                  }`}
                  onClick={() => !isDisabled && handleDateClick(day)}
                >
                  <div className="flex flex-col h-full">
                    <div className={`text-sm font-medium mb-1 flex items-center justify-between ${
                      isDisabled ? 'text-muted-foreground' : 
                      'text-foreground'
                    }`}>
                      <span>{day}</span>
                      {!isDisabled && (
                        <Plus className="h-3 w-3 opacity-50 hover:opacity-100" />
                      )}
                      {isWeekendDate && !leaveOnDate && !holidayOnDate && (
                        <span className="text-xs text-gray-500">Weekend</span>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      {/* Show existing leave */}
                      {leaveOnDate && (
                        <Badge 
                          variant="secondary" 
                          className={`text-xs px-1 py-0 w-full justify-center cursor-pointer hover:opacity-80 ${getLeaveTypeColor(leaveOnDate.leaveType, leaveOnDate.status)}`}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent date selection
                            handleLeaveClick(leaveOnDate);
                          }}
                          title="Click to view details"
                        >
                          {leaveOnDate.leaveType}
                        </Badge>
                      )}
                      
                      {/* Show weekend indicator */}
                      {!leaveOnDate && isWeekendDate && (
                        <div className="text-xs text-center text-gray-500 dark:text-gray-400 font-medium">
                          Weekend
                        </div>
                      )}
                      
                      {/* Show holiday indicator */}
                      {!leaveOnDate && holidayOnDate && (
                        <Badge 
                          variant="secondary" 
                          className="text-xs px-1 py-0 w-full justify-center bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800"
                          title={holidayOnDate.description || holidayOnDate.name}
                        >
                          {holidayOnDate.name.length > 8 ? holidayOnDate.name.substring(0, 8) + '...' : holidayOnDate.name}
                        </Badge>
                      )}
                      
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="shadow-professional-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded"></div>
              <span>Casual Leave</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded"></div>
              <span>Earned Leave</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded"></div>
              <span>Sick Leave</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-100 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded"></div>
              <span>Compensation Off</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-muted border border-border border-dashed rounded"></div>
              <span>Pending Approval</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"></div>
              <span>Weekend</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-100 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded"></div>
              <span>Holiday</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Apply Leave Dialog */}
      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary" />
              Apply for Leave
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, endDate: e.target.value }))}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="leaveType">Leave Type *</Label>
              <Select 
                value={leaveForm.leaveType} 
                onValueChange={(value) => setLeaveForm(prev => ({ ...prev, leaveType: value as LeaveType }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(leaveTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Please provide a reason for your leave request..."
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                className="min-h-[100px]"
                required
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetLeaveForm();
                  setIsApplyDialogOpen(false);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-gradient-primary hover:opacity-90"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Leave Request Dialog */}
      <Dialog open={isViewLeaveDialogOpen} onOpenChange={setIsViewLeaveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Leave Request Details</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedLeaveRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Leave Type</Label>
                  <div className="mt-1 text-sm">
                    {leaveTypeLabels[selectedLeaveRequest.leaveType as LeaveType] || selectedLeaveRequest.leaveType}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge
                      variant={
                        selectedLeaveRequest.status === 'approved'
                          ? 'default'
                          : selectedLeaveRequest.status === 'rejected'
                          ? 'destructive'
                          : selectedLeaveRequest.status === 'cancelled'
                          ? 'secondary'
                          : 'outline'
                      }
                      className={
                        selectedLeaveRequest.status === 'approved'
                          ? 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800'
                          : selectedLeaveRequest.status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800'
                          : ''
                      }
                    >
                      {selectedLeaveRequest.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Start Date</Label>
                  <div className="mt-1 text-sm">
                    {new Date(selectedLeaveRequest.startDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">End Date</Label>
                  <div className="mt-1 text-sm">
                    {new Date(selectedLeaveRequest.endDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Duration</Label>
                <div className="mt-1 text-sm">
                  {selectedLeaveRequest.daysCount} day(s)
                </div>
              </div>

              {selectedLeaveRequest.reason && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Reason</Label>
                  <div className="mt-1 text-sm bg-muted p-3 rounded-md">
                    {selectedLeaveRequest.reason}
                  </div>
                </div>
              )}

              {selectedLeaveRequest.rejectionReason && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Rejection Reason</Label>
                  <div className="mt-1 text-sm bg-red-50 dark:bg-red-950/50 p-3 rounded-md border border-red-200 dark:border-red-800">
                    {selectedLeaveRequest.rejectionReason}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Applied On</Label>
                  <div className="mt-1">
                    {new Date(selectedLeaveRequest.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {selectedLeaveRequest.approvedAt && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      {selectedLeaveRequest.status === 'approved' ? 'Approved On' : 
                       selectedLeaveRequest.status === 'rejected' ? 'Rejected On' : 'Updated On'}
                    </Label>
                    <div className="mt-1">
                      {new Date(selectedLeaveRequest.approvedAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsViewLeaveDialogOpen(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                {selectedLeaveRequest.status === 'pending' && (
                  <Button
                    onClick={handleCancelLeave}
                    disabled={isCancelling}
                    variant="destructive"
                    className="flex-1"
                  >
                    {isCancelling ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      'Cancel Request'
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplyLeave;