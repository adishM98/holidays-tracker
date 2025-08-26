import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CheckCircle, XCircle, Plus, Users, Loader2, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { employeeAPI, managerAPI, adminAPI } from '@/services/api';
import { DashboardData, LeaveRequest, LeaveBalance } from '@/types';
import { useToast } from '@/hooks/use-toast';

const Dashboard: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [managerData, setManagerData] = useState<any>(null);
  const [upcomingHolidays, setUpcomingHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminRequests, setAdminRequests] = useState<any>(null);
  const [isProcessingApproval, setIsProcessingApproval] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user && !authLoading) {
      loadDashboardData();
    }
  }, [user, authLoading]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      if (user?.role === 'employee' || user?.role === 'manager') {
        const data = await employeeAPI.getDashboard();
        setDashboardData(data);
      }
      
      if (user?.role === 'manager') {
        const managerStats = await managerAPI.getDashboardStats();
        const teamRequests = await managerAPI.getTeamRequests(1, 5, 'pending');
        setManagerData({ stats: managerStats, teamRequests });
      }
      
      if (user?.role === 'admin') {
        // Get all recent requests, not just pending ones for the Recent Requests section
        const adminLeaveRequests = await adminAPI.getAllLeaveRequests();
        console.log('Admin leave requests:', adminLeaveRequests);
        setAdminRequests(adminLeaveRequests);
      }

      // Load upcoming holidays for all users
      try {
        const holidays = await adminAPI.getUpcomingHolidays(30);
        setUpcomingHolidays(holidays || []);
      } catch (error) {
        // Holidays are optional, don't fail the dashboard if they can't be loaded
        console.warn('Failed to load upcoming holidays:', error);
        setUpcomingHolidays([]);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: "Error loading dashboard",
        description: "Failed to load dashboard data. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
      annual: 'Annual Leave',
      sick: 'Sick Leave',
      casual: 'Casual Leave',
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

      // Refresh the dashboard data
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

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {dashboardData?.employee?.fullName?.split(' ')[0] || 'Admin'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your leave management
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
                case 'annual':
                  return 'text-primary';
                case 'sick':
                  return 'text-accent';
                case 'casual':
                  return 'text-success';
                default:
                  return 'text-muted-foreground';
              }
            };

            return (
              <Card key={balance.id} className="bg-gradient-card shadow-professional-md border-0">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Open Requests - Left Side */}
        <Card className="shadow-professional-md border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-primary" />
              Open Requests
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
              {user?.role === 'admin' ? 'Pending leave applications from all employees' : 'Your pending leave applications'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              {(() => {
                const pendingCount = user?.role === 'admin' 
                  ? adminRequests?.requests?.filter(req => req.status === 'pending').length || 0
                  : dashboardData?.recentRequests?.filter(req => req.status === 'pending').length || 0;
                
                return pendingCount > 0 ? (
                  <div>
                    <p className="text-muted-foreground mb-4">
                      {pendingCount} {pendingCount === 1 ? 'request' : 'requests'} awaiting review
                    </p>
                    <Link to={user?.role === 'admin' ? '/admin/calendar' : '/leave-history'} className="block">
                      <Button variant="outline">
                        {user?.role === 'admin' ? 'View Leave Calendar' : 'View All Requests'}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div>
                    <p className="text-muted-foreground mb-4">
                      {user?.role === 'admin' ? 'No pending requests from employees' : 'No pending requests'}
                    </p>
                    {user?.role !== 'admin' && (
                      <Link to="/apply-leave" className="block">
                        <Button>Apply for Leave</Button>
                      </Link>
                    )}
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Manager Dashboard Section */}
        {user?.role === 'manager' && managerData && (
          <Card className="shadow-professional-md border-0 bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-warning" />
                Pending Approvals
                {managerData.stats.pendingRequests > 0 && (
                  <Badge className="ml-2 bg-warning text-warning-foreground">
                    {managerData.stats.pendingRequests}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Team leave requests awaiting your review ({managerData.stats.teamSize} team members)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {managerData.teamRequests?.requests && managerData.teamRequests.requests.length > 0 ? (
                <div className="space-y-4">
                  {managerData.teamRequests.requests.map((request: LeaveRequest) => (
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
                      <Badge className="text-xs px-2 py-1 bg-warning-light text-warning border-warning/20">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Pending</span>
                        </div>
                      </Badge>
                    </div>
                  ))}
                  <Link to="/pending-approvals" className="block">
                    <Button variant="outline" className="w-full mt-4">
                      Review All Requests
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
        <Card className="shadow-professional-md border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-accent" />
              Upcoming Holidays
            </CardTitle>
            <CardDescription>
              Company holidays in the next 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingHolidays && upcomingHolidays.length > 0 ? (
              <div className="space-y-4">
                {upcomingHolidays.slice(0, 5).map((holiday) => (
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
              <div className="text-center py-8">
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