import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Check,
  X,
  CalendarDays,
  Users,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { TimeManagementBackground } from '@/components/ui/time-management-background';

interface LeaveRequest {
  id: string;
  employee: {
    firstName: string;
    lastName: string;
    manager?: {
      firstName: string;
      lastName: string;
    };
  };
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason?: string;
  status: string;
  createdAt: string;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  isRecurring?: boolean;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const { toast } = useToast();

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [requestsData, holidaysData] = await Promise.all([
        adminAPI.getAllLeaveRequests(),
        adminAPI.getUpcomingHolidays(30)
      ]);

      setRequests(requestsData.requests || []);
      setHolidays(holidaysData || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadDashboardData();
    }
  }, [user]);

  const handleApproval = async (requestId: string, action: 'approved' | 'rejected') => {
    setIsProcessing(requestId);

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
        title: "Error",
        description: error.message || "Failed to process the request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
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
    };
    return labels[type] || type;
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(req => req.status === activeTab);
  }, [requests, activeTab]);

  const DashboardSkeleton = () => (
    <div className="space-y-8">
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Skeleton className="lg:col-span-2 h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="relative min-h-screen">
        <TimeManagementBackground />
        <div className="relative z-10 space-y-8 max-w-7xl mx-auto p-8">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <TimeManagementBackground />
      <div className="relative z-10 space-y-4 max-w-7xl mx-auto p-4">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center">
                Welcome back, Admin
                <span className="ml-2">👋</span>
              </h1>
              <p className="text-muted-foreground text-sm">
                Track, approve, and manage leave requests
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column (70% width) - Pending Approvals */}
          <Card className="lg:col-span-2 shadow-lg border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-blue-950/20 backdrop-blur-sm min-h-[500px]">
            <CardHeader className="relative border-b border-border/50 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4 shadow-md">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl flex items-center">
                      Pending Approvals
                      {requests.filter(r => r.status === 'pending').length > 0 && (
                        <Badge className="ml-3 bg-blue-500 text-white px-2 py-1">
                          {requests.filter(r => r.status === 'pending').length}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Pending leave applications from all employees
                    </CardDescription>
                  </div>
                </div>
                <Link to="/admin/calendar">
                  <Button variant="outline" size="sm" className="rounded-full">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    View Calendar
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="pending" className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Pending</span>
                    {requests.filter(r => r.status === 'pending').length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {requests.filter(r => r.status === 'pending').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Approved</span>
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="flex items-center space-x-2">
                    <XCircle className="h-4 w-4" />
                    <span>Rejected</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="space-y-3">
                  {filteredRequests.length > 0 ? (
                    filteredRequests.slice(0, 5).map((request, index) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border/50 hover:shadow-md transition-all duration-200 hover:scale-[1.01]"
                        style={{
                          animation: `fadeIn 0.3s ease-out ${index * 0.1}s both`
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {request.employee.firstName[0]}{request.employee.lastName[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground text-base">
                                {request.employee.firstName} {request.employee.lastName}
                              </p>
                              {request.employee.manager && (
                                <p className="text-xs text-muted-foreground">
                                  Manager: {request.employee.manager.firstName} {request.employee.manager.lastName}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {getLeaveTypeLabel(request.leaveType)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(request.startDate)} - {formatDate(request.endDate)}
                            </span>
                            <span className="text-sm font-medium text-blue-600">
                              ({request.daysCount} days)
                            </span>
                          </div>
                          {request.reason && (
                            <p className="text-sm text-muted-foreground italic truncate max-w-2xl">
                              "{request.reason}"
                            </p>
                          )}
                        </div>
                        {activeTab === 'pending' && (
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              onClick={() => handleApproval(request.id, 'approved')}
                              disabled={isProcessing === request.id}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white rounded-full px-4"
                            >
                              {isProcessing === request.id ? (
                                <Clock className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => handleApproval(request.id, 'rejected')}
                              disabled={isProcessing === request.id}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-300 hover:bg-red-50 rounded-full px-4"
                            >
                              {isProcessing === request.id ? (
                                <Clock className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Clock className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {activeTab === 'pending' && "All caught up!"}
                        {activeTab === 'approved' && "No approved requests"}
                        {activeTab === 'rejected' && "No rejected requests"}
                      </h3>
                      <p className="text-muted-foreground">
                        {activeTab === 'pending' && "No pending requests from employees at the moment"}
                        {activeTab === 'approved' && "Approved requests will appear here"}
                        {activeTab === 'rejected' && "Rejected requests will appear here"}
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Right Column (30% width) */}
          <div>
            {/* Upcoming Holidays Card */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-blue-950/20 backdrop-blur-sm min-h-[500px]">
              <CardHeader className="border-b border-border/50 pb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Upcoming Holidays</CardTitle>
                    <CardDescription>Next 30 days</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {holidays && holidays.length > 0 ? (
                  <div className="space-y-3">
                    {holidays.slice(0, 5).map((holiday, index) => (
                      <div
                        key={holiday.id}
                        className="flex items-start space-x-3 p-3 bg-background/50 rounded-lg hover:shadow-sm transition-all duration-200"
                        style={{
                          animation: `fadeIn 0.3s ease-out ${index * 0.1}s both`
                        }}
                      >
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg flex flex-col items-center justify-center">
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                              {new Date(holiday.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                            </span>
                            <span className="text-lg font-bold text-blue-900 dark:text-blue-200">
                              {new Date(holiday.date).getDate()}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{holiday.name}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(holiday.date)}</p>
                          {holiday.description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{holiday.description}</p>
                          )}
                          {holiday.isRecurring && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Recurring
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    <Link to="/admin/settings" className="block">
                      <Button variant="outline" className="w-full mt-2 rounded-full">
                        Manage Holidays
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-2">No holidays soon</h3>
                    <p className="text-sm text-muted-foreground mb-4">Add company holidays</p>
                    <Link to="/admin/settings">
                      <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg rounded-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Holiday
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
