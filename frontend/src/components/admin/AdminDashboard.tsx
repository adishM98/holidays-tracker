import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  CheckCircle,
  Plus,
  Users,
  BarChart3,
  TrendingUp,
  Check,
  X,
  ChevronRight,
  CalendarCheck,
  CalendarX,
  CalendarDays,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { TimeManagementBackground } from '@/components/ui/time-management-background';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  employees: {
    total: number;
    active: number;
    inactive: number;
    onLeaveToday: number;
  };
  departments: {
    total: number;
  };
  leaves: {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    byType: Array<{ type: string; count: number }>;
    byMonth: Array<{ month: string; count: number }>;
  };
  holidays: {
    total: number;
    upcoming: number;
  };
}

interface LeaveRequest {
  id: string;
  employee: {
    firstName: string;
    lastName: string;
    fullName?: string;
  };
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason?: string;
  status: string;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  isRecurring: boolean;
}

const AdminDashboard: React.FC = () => {
  const { toast } = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingApproval, setIsProcessingApproval] = useState<string | null>(null);

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      const [dashboardStats, leaveRequests, holidays] = await Promise.allSettled([
        adminAPI.getDashboardStats(),
        adminAPI.getAllLeaveRequests('pending'),
        adminAPI.getUpcomingHolidays(30),
      ]);

      if (dashboardStats.status === 'fulfilled') {
        setStats(dashboardStats.value);
      }

      if (leaveRequests.status === 'fulfilled') {
        setPendingRequests(leaveRequests.value.requests || []);
      }

      if (holidays.status === 'fulfilled') {
        setUpcomingHolidays(holidays.value || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: 'Error loading dashboard',
        description: 'Failed to load dashboard data. Please refresh the page.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = async (requestId: string, action: 'approved' | 'rejected') => {
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

      loadDashboardData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process the request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingApproval(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sick: 'Sick',
      casual: 'Casual',
      earned: 'Earned',
      compensation: 'Comp Off',
      annual: 'Annual',
    };
    return labels[type] || type;
  };

  // Prepare chart data
  const leaveTypeChartData = useMemo(() => {
    if (!stats?.leaves.byType) return [];
    return stats.leaves.byType.map(item => ({
      name: getLeaveTypeLabel(item.type),
      count: item.count,
    }));
  }, [stats]);

  const monthlyTrendData = useMemo(() => {
    if (!stats?.leaves.byMonth) {
      // Fallback to empty array if no data
      return [];
    }
    return stats.leaves.byMonth.map(item => ({
      month: item.month,
      leaves: item.count,
    }));
  }, [stats]);

  // Calculate current month's approved count
  const getMonthlyApprovedCount = () => {
    if (!stats?.leaves.byMonth) return 0;

    const currentMonth = new Date().toLocaleString('en-US', { month: 'short' });
    const currentMonthData = stats.leaves.byMonth.find(m => m.month === currentMonth);

    // For now, we'll estimate based on approval ratio
    // In production, you'd want a dedicated API endpoint for this
    if (currentMonthData && stats.leaves.totalRequests > 0) {
      const approvalRate = stats.leaves.approvedRequests / stats.leaves.totalRequests;
      return Math.round(currentMonthData.count * approvalRate);
    }
    return 0;
  };

  // Calculate current month's rejected count
  const getMonthlyRejectedCount = () => {
    if (!stats?.leaves.byMonth) return 0;

    const currentMonth = new Date().toLocaleString('en-US', { month: 'short' });
    const currentMonthData = stats.leaves.byMonth.find(m => m.month === currentMonth);

    // For now, we'll estimate based on rejection ratio
    // In production, you'd want a dedicated API endpoint for this
    if (currentMonthData && stats.leaves.totalRequests > 0) {
      const rejectionRate = stats.leaves.rejectedRequests / stats.leaves.totalRequests;
      return Math.round(currentMonthData.count * rejectionRate);
    }
    return 0;
  };

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <TimeManagementBackground />
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, Admin 👋
          </h1>
          <p className="text-muted-foreground mt-1">{formattedDate}</p>
        </div>

        <div className="max-w-7xl mx-auto px-6 space-y-8">
          {/* Top Stats Grid - 3 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pending Approvals Card */}
            <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-blue-950/20 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-blue-600">
                        {pendingRequests.length}
                      </CardTitle>
                      <CardDescription className="text-sm">Pending Approvals</CardDescription>
                    </div>
                  </div>
                  {pendingRequests.length > 0 && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      Action Required
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {pendingRequests.length > 0 ? (
                  <div className="space-y-3">
                    {pendingRequests.slice(0, 3).map((request) => (
                      <div key={request.id} className="p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-blue-100">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {request.employee.fullName || `${request.employee.firstName} ${request.employee.lastName}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(request.startDate)} - {formatDate(request.endDate)}
                            </p>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {getLeaveTypeLabel(request.leaveType)}
                            </Badge>
                          </div>
                          <div className="flex space-x-1 ml-2">
                            <Button
                              onClick={() => handleApproval(request.id, 'approved')}
                              disabled={isProcessingApproval === request.id}
                              size="sm"
                              className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              onClick={() => handleApproval(request.id, 'rejected')}
                              disabled={isProcessingApproval === request.id}
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Link to="/admin/calendar">
                      <Button variant="ghost" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        View All <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">All caught up!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Holidays Card */}
            <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-blue-950/20 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-blue-600">
                        {upcomingHolidays.length}
                      </CardTitle>
                      <CardDescription className="text-sm">Upcoming Holidays</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingHolidays.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingHolidays.slice(0, 2).map((holiday) => (
                      <div key={holiday.id} className="p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-blue-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{holiday.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(holiday.date).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          {holiday.isRecurring && (
                            <Badge variant="outline" className="text-xs">
                              Recurring
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    <Link to="/admin/settings">
                      <Button variant="ghost" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        <Plus className="h-4 w-4 mr-1" />
                        Manage Holidays
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-blue-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">No upcoming holidays</p>
                    <Link to="/admin/settings">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-3 w-3 mr-1" />
                        Add Holiday
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Leave Stats Card */}
            <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-blue-950/20 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Quick Stats</CardTitle>
                    <CardDescription className="text-xs">System overview</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border">
                    <div className="flex items-center space-x-2 mb-1">
                      <Users className="h-4 w-4 text-blue-600" />
                      <p className="text-xs text-muted-foreground">Total Employees</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{stats.employees.total}</p>
                  </div>
                  <div className="p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border">
                    <div className="flex items-center space-x-2 mb-1">
                      <CalendarDays className="h-4 w-4 text-blue-600" />
                      <p className="text-xs text-muted-foreground">On Leave Today</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{stats.employees.onLeaveToday || 0}</p>
                  </div>
                  <div className="p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border">
                    <div className="flex items-center space-x-2 mb-1">
                      <CalendarCheck className="h-4 w-4 text-blue-600" />
                      <p className="text-xs text-muted-foreground">Approved (Month)</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{getMonthlyApprovedCount()}</p>
                  </div>
                  <div className="p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border">
                    <div className="flex items-center space-x-2 mb-1">
                      <CalendarX className="h-4 w-4 text-blue-600" />
                      <p className="text-xs text-muted-foreground">Rejected (Month)</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{getMonthlyRejectedCount()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leave Trends Chart - Full Width */}
          <Card className="shadow-xl border-0 hover:shadow-2xl transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle>Leave Trends</CardTitle>
                  <CardDescription>Monthly leave requests overview</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="leaves"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Leave Type Distribution Chart */}
          {leaveTypeChartData.length > 0 && (
            <Card className="shadow-xl border-0 hover:shadow-2xl transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Leave Type Distribution</CardTitle>
                    <CardDescription>Breakdown of leave requests by type</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={leaveTypeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
