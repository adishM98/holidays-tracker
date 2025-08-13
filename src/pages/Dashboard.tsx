import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CheckCircle, XCircle, Plus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockLeaveRequests, statusConfig, leaveTypeLabels } from '@/data/mockData';
import { LeaveRequest } from '@/types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const userRequests = mockLeaveRequests.filter(req => req.employeeId === user?.id);
  const pendingRequests = mockLeaveRequests.filter(req => req.status === 'pending');
  const recentRequests = userRequests.slice(0, 3);

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your leave management
          </p>
        </div>
        <Link to="/apply-leave">
          <Button className="bg-gradient-primary hover:opacity-90 transition-smooth shadow-professional-sm">
            <Plus className="h-4 w-4 mr-2" />
            Apply Leave
          </Button>
        </Link>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-card shadow-professional-md border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Leave</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{user?.leaveBalance.paid}</div>
            <p className="text-xs text-muted-foreground">days remaining</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-professional-md border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sick Leave</CardTitle>
            <Calendar className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{user?.leaveBalance.sick}</div>
            <p className="text-xs text-muted-foreground">days remaining</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-professional-md border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casual Leave</CardTitle>
            <Calendar className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{user?.leaveBalance.casual}</div>
            <p className="text-xs text-muted-foreground">days remaining</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Leave Requests */}
        <Card className="shadow-professional-md border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-primary" />
              Recent Requests
            </CardTitle>
            <CardDescription>Your latest leave applications</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRequests.length > 0 ? (
              <div className="space-y-4">
                {recentRequests.map((request: LeaveRequest) => (
                  <div key={request.id} className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-foreground">
                          {leaveTypeLabels[request.leaveType]}
                        </p>
                        <Badge className={`text-xs px-2 py-1 ${statusConfig[request.status].className}`}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(request.status)}
                            <span>{statusConfig[request.status].label}</span>
                          </div>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(request.startDate)} - {formatDate(request.endDate)} ({request.days} days)
                      </p>
                    </div>
                  </div>
                ))}
                <Link to="/leave-history" className="block">
                  <Button variant="outline" className="w-full mt-4">
                    View All Requests
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No leave requests yet</p>
                <Link to="/apply-leave" className="block mt-4">
                  <Button>Apply for Leave</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manager Dashboard Section */}
        {user?.role === 'manager' && (
          <Card className="shadow-professional-md border-0 bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-warning" />
                Pending Approvals
              </CardTitle>
              <CardDescription>Team leave requests awaiting your review</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length > 0 ? (
                <div className="space-y-4">
                  {pendingRequests.slice(0, 3).map((request: LeaveRequest) => (
                    <div key={request.id} className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{request.employeeName}</p>
                        <p className="text-sm text-muted-foreground">
                          {leaveTypeLabels[request.leaveType]} • {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </p>
                      </div>
                      <Badge className={`text-xs px-2 py-1 ${statusConfig.pending.className}`}>
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
      </div>
    </div>
  );
};

export default Dashboard;