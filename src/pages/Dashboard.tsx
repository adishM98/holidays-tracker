import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, CheckCircle, XCircle, Plus, Users, Loader2, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { employeeAPI, managerAPI, adminAPI } from '@/services/api';
import { DashboardData, LeaveRequest, LeaveBalance } from '@/types';
import { useToast } from '@/hooks/use-toast';

const Dashboard: React.FC = () => {
  const { user, isLoading: authLoading, checkRoleChange } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [managerData, setManagerData] = useState<any>(null);
  const [upcomingHolidays, setUpcomingHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminRequests, setAdminRequests] = useState<any>(null);
  const [isProcessingApproval, setIsProcessingApproval] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [roleChecked, setRoleChecked] = useState<boolean>(false);
  const { toast } = useToast();

  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  // Memoized date calculations to avoid recalculating on every render
  const dateFilters = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    return { today, thirtyDaysFromNow };
  }, []);

  // Memoized holiday filtering
  const filteredHolidays = useMemo(() => {
    if (!upcomingHolidays?.length) return [];
    
    return upcomingHolidays.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate >= dateFilters.today && holidayDate <= dateFilters.thirtyDaysFromNow;
    });
  }, [upcomingHolidays, dateFilters]);

  useEffect(() => {
    if (user && !authLoading) {
      const now = Date.now();
      const shouldFetch = !lastFetch || (now - lastFetch) > CACHE_DURATION;
      
      // Only check role changes once per session unless explicitly needed
      if (!roleChecked) {
        checkRoleChange().catch(error => {
          console.warn('Failed to check role changes on dashboard load:', error);
        });
        setRoleChecked(true);
      }
      
      if (shouldFetch) {
        loadDashboardData();
      } else {
        setIsLoading(false); // Skip loading if using cached data
      }
    }
  }, [user?.id, authLoading]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Prepare all API calls based on user role
      const apiCalls: Promise<any>[] = [];
      const callMap: string[] = [];
      
      // Employee/Manager dashboard data
      if (user?.role === 'employee' || user?.role === 'manager') {
        apiCalls.push(employeeAPI.getDashboard());
        callMap.push('dashboard');
      }
      
      // Manager specific data
      if (user?.role === 'manager') {
        apiCalls.push(managerAPI.getDashboardStats(), managerAPI.getTeamRequests(1, 5, 'pending'));
        callMap.push('managerStats', 'managerRequests');
      }
      
      // Admin data
      if (user?.role === 'admin') {
        apiCalls.push(adminAPI.getAllLeaveRequests(), adminAPI.getUpcomingHolidays(30));
        callMap.push('adminRequests', 'adminHolidays');
      }
      
      // Holidays for employee/manager (different API)
      if (user?.role === 'employee' || user?.role === 'manager') {
        const currentYear = new Date().getFullYear();
        apiCalls.push(employeeAPI.getHolidays(currentYear));
        callMap.push('holidays');
      }
      
      // Execute all API calls in parallel
      const results = await Promise.allSettled(apiCalls);
      
      // Process results based on call map
      let dashboardIndex = -1, managerStatsIndex = -1, managerRequestsIndex = -1;
      let adminRequestsIndex = -1, adminHolidaysIndex = -1, holidaysIndex = -1;
      
      callMap.forEach((call, index) => {
        switch (call) {
          case 'dashboard': dashboardIndex = index; break;
          case 'managerStats': managerStatsIndex = index; break;
          case 'managerRequests': managerRequestsIndex = index; break;
          case 'adminRequests': adminRequestsIndex = index; break;
          case 'adminHolidays': adminHolidaysIndex = index; break;
          case 'holidays': holidaysIndex = index; break;
        }
      });
      
      // Set dashboard data
      if (dashboardIndex >= 0 && results[dashboardIndex].status === 'fulfilled') {
        setDashboardData(results[dashboardIndex].value);
      }
      
      // Set manager data
      if (managerStatsIndex >= 0 && managerRequestsIndex >= 0) {
        const statsResult = results[managerStatsIndex];
        const requestsResult = results[managerRequestsIndex];
        
        if (statsResult.status === 'fulfilled' && requestsResult.status === 'fulfilled') {
          setManagerData({
            stats: statsResult.value,
            pendingRequests: requestsResult.value
          });
        }
      }
      
      // Set admin data
      if (adminRequestsIndex >= 0 && results[adminRequestsIndex].status === 'fulfilled') {
        setAdminRequests(results[adminRequestsIndex].value);
      }
      
      // Process holidays
      let holidaysData = [];
      if (adminHolidaysIndex >= 0 && results[adminHolidaysIndex].status === 'fulfilled') {
        // Admin holidays are already filtered by backend
        holidaysData = results[adminHolidaysIndex].value || [];
      } else if (holidaysIndex >= 0 && results[holidaysIndex].status === 'fulfilled') {
        // Store all holidays - filtering will be done by memoized filteredHolidays
        const holidaysResponse = results[holidaysIndex].value;
        holidaysData = holidaysResponse.holidays || [];
      }
      setUpcomingHolidays(holidaysData);
      
      // Log any failed requests for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`Failed to load ${callMap[index]}:`, result.reason);
        }
      });
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: "Error loading dashboard",
        description: "Failed to load dashboard data. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLastFetch(Date.now()); // Update cache timestamp
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sick: 'Sick Leave',
      casual: 'Casual Leave',
      earned: 'Earned/Privilege Leave',
      compensation: 'Compensation Off',
      // Legacy types for backward compatibility
      annual: 'Earned/Privilege Leave',
      maternity: 'Maternity Leave',
      paternity: 'Paternity Leave',
      unpaid: 'Unpaid Leave'
    };
    return labels[type] || type;
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
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
    return configs[status] || configs.pending;
  };

  const handleAdminApproval = async (requestId: string, action: 'approved' | 'rejected') => {
    setIsProcessingApproval(requestId);
    
    try {
      if (action === 'approved') {
        await adminAPI.approveLeaveRequest(requestId, 'Approved by admin');
      } else {
        await adminAPI.rejectLeaveRequest(requestId, 'Rejected by admin');
      }

      toast({
        title: `Request ${action}`,
        description: `Leave request has been ${action} successfully.`,
      });

      // Refresh the dashboard data and invalidate cache
      setLastFetch(0);
      loadDashboardData();
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

  const handleManagerApproval = async (requestId: string, action: 'approved' | 'rejected') => {
    setIsProcessingApproval(requestId);
    
    try {
      if (action === 'approved') {
        await managerAPI.approveLeaveRequest(requestId, 'Approved by manager');
      } else {
        await managerAPI.rejectLeaveRequest(requestId, 'Rejected by manager');
      }

      toast({
        title: `Request ${action}`,
        description: `Leave request has been ${action} successfully.`,
      });

      // Refresh the dashboard data and invalidate cache
      setLastFetch(0);
      loadDashboardData();
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

  const DashboardSkeleton = () => (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Leave Balance Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="bg-gradient-card shadow-professional-md border border-border/50 dark:border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
        {/* Left Card Skeleton */}
        <Card className="shadow-professional-md border border-border/50 bg-gradient-card dark:border-0">
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="p-8 pt-0">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border mb-3">
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Right Card Skeleton */}
        <Card className="shadow-professional-md border border-border/50 bg-gradient-card dark:border-0">
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="p-8 pt-0">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center justify-between p-4 bg-background/50 rounded-lg mb-4">
                <div className="flex-1">
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (authLoading) {
    return <DashboardSkeleton />;
  }

  if (isLoading && (!dashboardData && !adminRequests && !managerData)) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {dashboardData?.employee?.fullName?.split(' ')[0] || 'Admin'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Your Time Away at a Glance
          </p>
        </div>
        {(user.role === 'employee' || user.role === 'manager') && (
          <Link to="/apply-leave">
            <Button className="bg-gradient-primary hover:opacity-90 transition-smooth shadow-professional-sm">
              <Plus className="h-4 w-4 mr-2" />
              Apply Leave
            </Button>
          </Link>
        )}
      </div>

      {/* Leave Balance Cards */}
      {dashboardData?.leaveBalances && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dashboardData.leaveBalances.map((balance: LeaveBalance) => {
            const getBalanceColor = (type: string) => {
              switch (type) {
                case 'earned':
                case 'annual': // legacy support
                  return 'text-primary';
                case 'sick':
                  return 'text-red-500';
                case 'casual':
                  return 'text-green-500';
                case 'compensation':
                  return 'text-orange-500';
                default:
                  return 'text-muted-foreground';
              }
            };

            return (
              <Card key={balance.id} className="bg-gradient-card shadow-professional-md border border-border/50 dark:border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {getLeaveTypeLabel(balance.leaveType)}
                  </CardTitle>
                  <Calendar className={`h-4 w-4 ${getBalanceColor(balance.leaveType)}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getBalanceColor(balance.leaveType)}`}>
                    {balance.availableDays}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    of {balance.totalAllocated} days remaining
                  </p>
                  {balance.carryForward > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      (includes {balance.carryForward} carried forward)
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
        {/* Open Requests - Left Side */}
        <Card className="shadow-professional-md border border-border/50 bg-gradient-card dark:border-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-primary" />
              {user?.role === 'admin' ? 'Pending Approvals' : 'My Leave Requests'}
              {(() => {
                const pendingCount = user?.role === 'admin' 
                  ? adminRequests?.requests?.filter(req => req.status === 'pending').length || 0
                  : dashboardData?.recentRequests?.filter(req => req.status === 'pending').length || 0;
                
                return pendingCount > 0 && (
                  <Badge className="ml-2 bg-warning text-warning-foreground">
                    {pendingCount}
                  </Badge>
                );
              })()}
            </CardTitle>
            <CardDescription>
              {user?.role === 'admin' ? 'Pending leave applications from all employees' : 'Your recent leave requests and their status'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            {user?.role === 'employee' || user?.role === 'manager' ? (
              // Employee/Manager view: Show their own requests
              dashboardData?.recentRequests && dashboardData.recentRequests.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recentRequests.slice(0, 3).map((request: LeaveRequest) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {getLeaveTypeLabel(request.leaveType)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(request.startDate)} - {formatDate(request.endDate)} ({request.daysCount} days)
                        </p>
                        {request.reason && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {request.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusConfig(request.status).className}>
                          {getStatusIcon(request.status)}
                          <span className="ml-1">{getStatusConfig(request.status).label}</span>
                        </Badge>
                      </div>
                    </div>
                  ))}
                  <Link to="/leave-history" className="block">
                    <Button variant="outline" className="w-full mt-4">
                      View All in Leave History
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No leave requests yet</p>
                  <Link to="/apply-leave" className="block">
                    <Button>Apply for Leave</Button>
                  </Link>
                </div>
              )
            ) : (
              // Admin view: Show pending requests from all employees with approval actions
              (() => {
                const pendingRequests = adminRequests?.requests?.filter(req => req.status === 'pending') || [];
                
                return pendingRequests.length > 0 ? (
                  <div className="space-y-3">
                    {pendingRequests.slice(0, 3).map((request: any) => (
                      <div key={request.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {request.employee?.firstName} {request.employee?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getLeaveTypeLabel(request.leaveType)} • {formatDate(request.startDate)} - {formatDate(request.endDate)} ({request.daysCount} days)
                          </p>
                          {request.employee?.manager && (
                            <p className="text-xs text-muted-foreground">
                              Manager: {request.employee.manager.firstName} {request.employee.manager.lastName}
                            </p>
                          )}
                          {request.reason && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {request.reason}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => handleAdminApproval(request.id, 'approved')}
                            disabled={isProcessingApproval === request.id}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                            title="Approve request"
                          >
                            {isProcessingApproval === request.id ? (
                              <Clock className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            onClick={() => handleAdminApproval(request.id, 'rejected')}
                            disabled={isProcessingApproval === request.id}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50 h-8 px-3"
                            title="Reject request"
                          >
                            {isProcessingApproval === request.id ? (
                              <Clock className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Link to="/admin/calendar" className="block">
                      <Button variant="outline" className="w-full mt-4">
                        View Leave Calendar
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending requests from employees</p>
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>

        {/* Manager Dashboard - Pending Approvals */}
        {user?.role === 'manager' && managerData && (
          <Card className="shadow-professional-md border border-border/50 bg-gradient-card dark:border-0">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-warning" />
                Pending Approvals
                {managerData.stats?.pendingRequests > 0 && (
                  <Badge className="ml-2 bg-warning text-warning-foreground">
                    {managerData.stats.pendingRequests}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Team leave requests awaiting your review ({managerData.stats?.teamSize || 0} team members)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              {managerData.pendingRequests?.requests && managerData.pendingRequests.requests.length > 0 ? (
                <div className="space-y-4">
                  {managerData.pendingRequests.requests.map((request: LeaveRequest) => (
                    <div key={request.id} className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{request.employee.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          {getLeaveTypeLabel(request.leaveType)} • {formatDate(request.startDate)} - {formatDate(request.endDate)} ({request.daysCount} days)
                        </p>
                        {request.reason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {request.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => handleManagerApproval(request.id, 'approved')}
                          disabled={isProcessingApproval === request.id}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                          title="Approve request"
                        >
                          {isProcessingApproval === request.id ? (
                            <Clock className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          onClick={() => handleManagerApproval(request.id, 'rejected')}
                          disabled={isProcessingApproval === request.id}
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-50 h-8 px-3"
                          title="Reject request"
                        >
                          {isProcessingApproval === request.id ? (
                            <Clock className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Link to="/pending-approvals" className="block">
                    <Button variant="outline" className="w-full mt-4">
                      Review All Pending Requests
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending approvals</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}


        {/* Upcoming Holidays Section - Right Side */}
        <Card className="shadow-professional-md border border-border/50 bg-gradient-card dark:border-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-primary" />
              Upcoming Holidays
            </CardTitle>
            <CardDescription>
              Company holidays in the next 30 days
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            {filteredHolidays && filteredHolidays.length > 0 ? (
              <div className="space-y-4">
                {filteredHolidays.slice(0, 5).map((holiday) => (
                  <div key={holiday.id} className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{holiday.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(holiday.date)}
                      </p>
                      {holiday.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {holiday.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center">
                      {holiday.isRecurring && (
                        <Badge variant="outline" className="text-xs">
                          Recurring
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {user?.role === 'admin' && (
                  <Link to="/admin/settings" className="block">
                    <Button variant="outline" className="w-full mt-4">
                      Manage Holidays
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No upcoming holidays</p>
                {user?.role === 'admin' && (
                  <Link to="/admin/settings" className="block mt-4">
                    <Button>Add Holidays</Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Dashboard;