import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CheckCircle, XCircle, Plus, Users, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { employeeAPI, managerAPI } from '@/services/api';
import { DashboardData, LeaveRequest, LeaveBalance } from '@/types';
import { useToast } from '@/hooks/use-toast';

const Dashboard: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [managerData, setManagerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
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
        {/* Recent Leave Requests */}
        <Card className="shadow-professional-md border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-primary" />
              Recent Requests
            </CardTitle>
            <CardDescription>
              {user?.role === 'admin' ? 'Latest leave applications from all employees' : 'Your latest leave applications'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData?.recentRequests && dashboardData.recentRequests.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recentRequests.map((request: LeaveRequest) => {
                  const statusConfig = getStatusConfig(request.status);
                  return (
                    <div key={request.id} className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-foreground">
                            {getLeaveTypeLabel(request.leaveType)}
                          </p>
                          <Badge className={`text-xs px-2 py-1 ${statusConfig.className}`}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(request.status)}
                              <span>{statusConfig.label}</span>
                            </div>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(request.startDate)} - {formatDate(request.endDate)} ({request.daysCount} days)
                        </p>
                        {request.reason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {request.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <Link to="/leave-history" className="block">
                  <Button variant="outline" className="w-full mt-4">
                    View All Requests
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {user?.role === 'admin' ? 'No leave requests from employees yet' : 'No leave requests yet'}
                </p>
                {user?.role !== 'admin' && (
                  <Link to="/apply-leave" className="block mt-4">
                    <Button>Apply for Leave</Button>
                  </Link>
                )}
              </div>
            )}
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

        {/* Admin Dashboard Section */}
        {user?.role === 'admin' && (
          <Card className="shadow-professional-md border-0 bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-primary" />
                Admin Panel
              </CardTitle>
              <CardDescription>System administration and management</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Link to="/admin/employees">
                    <Button variant="outline" className="w-full h-16 flex flex-col">
                      <Users className="h-6 w-6 mb-1" />
                      <span className="text-sm">Manage Employees</span>
                    </Button>
                  </Link>
                  <Link to="/admin/reports">
                    <Button variant="outline" className="w-full h-16 flex flex-col">
                      <Calendar className="h-6 w-6 mb-1" />
                      <span className="text-sm">Reports</span>
                    </Button>
                  </Link>
                  <Link to="/admin/bulk-import">
                    <Button variant="outline" className="w-full h-16 flex flex-col">
                      <Plus className="h-6 w-6 mb-1" />
                      <span className="text-sm">Bulk Import</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;