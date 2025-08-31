import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { FileText, Search, Filter, Calendar, Clock, CheckCircle, XCircle, Loader2, User, TrendingUp, BarChart3, AlertCircle } from 'lucide-react';
import { statusConfig, leaveTypeLabels } from '@/data/mockData';
import { employeeAPI, managerAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

const LeaveHistory: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeaveHistory();
  }, [user]);

  const fetchLeaveHistory = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let data;

      if (user.role === 'employee') {
        data = await employeeAPI.getLeaveHistory();
      } else if (user.role === 'manager') {
        data = await managerAPI.getTeamRequests();
      } else {
        // For admin users, try to get their leave requests
        try {
          data = await employeeAPI.getLeaveRequests();
        } catch (adminError) {
          // If admin doesn't have employee profile, return empty array
          data = { requests: [] };
        }
      }

      // Extract requests array from response
      let requests = [];
      if (Array.isArray(data)) {
        requests = data;
      } else if (data?.requests && Array.isArray(data.requests)) {
        requests = data.requests;
      } else if (data?.data && Array.isArray(data.data)) {
        requests = data.data;
      }
      setLeaveRequests(requests);
    } catch (error) {
      console.error('Failed to fetch leave history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leave history. Check console for details.",
        variant: "destructive",
      });
      setLeaveRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredRequests = leaveRequests.filter(request => {
    const searchFields = [
      request.reason || '',
      request.employee?.firstName || '',
      request.employee?.lastName || '',
      leaveTypeLabels[request.leaveType] || request.leaveType || ''
    ];
    
    const matchesSearch = searchFields.some(field => 
      field.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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

  const getStatsData = () => {
    if (!filteredRequests.length) return null;
    
    return {
      total: filteredRequests.length,
      approved: filteredRequests.filter(req => req.status === 'approved').length,
      pending: filteredRequests.filter(req => req.status === 'pending').length,
      rejected: filteredRequests.filter(req => req.status === 'rejected').length,
    };
  };

  const stats = getStatsData();

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-primary rounded-xl">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Leave History</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {user?.role === 'manager' ? 'Team leave management dashboard' : 'Your comprehensive leave request history'}
              </p>
            </div>
          </div>
          
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                    <p className="text-xl font-bold">{stats.total}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Approved</p>
                    <p className="text-xl font-bold text-green-600">{stats.approved}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending</p>
                    <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                    <p className="text-xl font-bold text-red-600">{stats.rejected}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Enhanced Main Card */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Leave Requests</CardTitle>
                  <CardDescription className="text-sm">
                    {user?.role === 'manager' ? 'Monitor and track team leave applications' : 'View and track all your leave applications'}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="hidden sm:flex">
                {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <Separator className="mb-6" />
            
            {/* Enhanced Filters */}
            <div className="space-y-4 mb-8">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by reason, employee, or leave type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-10 text-sm border-2 focus:border-primary transition-colors"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 p-1 bg-muted/50 rounded-lg">
                    <Filter className="h-5 w-5 text-muted-foreground ml-3" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48 h-10 border-2 bg-background">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center space-x-2">
                            <BarChart3 className="h-4 w-4" />
                            <span>All Status</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="pending">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-yellow-500" />
                            <span>Pending</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="approved">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Approved</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="rejected">
                          <div className="flex items-center space-x-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span>Rejected</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-base font-semibold mb-2">Loading Leave History</h3>
                  <p className="text-muted-foreground">Please wait while we fetch your leave requests...</p>
                </div>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">No Leave Requests Found</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {searchTerm || statusFilter !== 'all' ? 
                      'Try adjusting your search criteria or filters to find leave requests.' :
                      'No leave requests have been submitted yet. Start by applying for leave.'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Enhanced Desktop Table View */}
                <div className="hidden lg:block">
                  <div className="rounded-lg border border-border/40 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-muted/40">
                          {user?.role === 'manager' && (
                            <TableHead className="font-semibold text-foreground py-4">
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4" />
                                <span>Employee</span>
                              </div>
                            </TableHead>
                          )}
                          <TableHead className="font-semibold text-foreground py-4">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4" />
                              <span>Leave Type</span>
                            </div>
                          </TableHead>
                          <TableHead className="font-semibold text-foreground py-4">Duration</TableHead>
                          <TableHead className="font-semibold text-foreground py-4">Applied Date</TableHead>
                          <TableHead className="font-semibold text-foreground py-4">Status</TableHead>
                          <TableHead className="font-semibold text-foreground py-4">Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRequests.map((request, index) => (
                          <TableRow 
                            key={request.id} 
                            className={`hover:bg-muted/20 transition-all duration-200 ${
                              index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                            }`}
                          >
                            {user?.role === 'manager' && (
                              <TableCell className="py-4">
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-gradient-primary text-white text-sm font-semibold">
                                      {request.employee ? 
                                        `${request.employee.firstName?.[0] || ''}${request.employee.lastName?.[0] || ''}` : 
                                        'U'
                                      }
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">
                                      {request.employee ? `${request.employee.firstName} ${request.employee.lastName}` : 'Unknown'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {request.employee?.employeeId || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                            )}
                            <TableCell className="py-4">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <p className="font-medium">{leaveTypeLabels[request.leaveType] || request.leaveType}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{request.leaveType}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="space-y-1">
                                <p className="font-medium text-sm">{formatDate(request.startDate)} - {formatDate(request.endDate)}</p>
                                <Badge variant="outline" className="text-xs">
                                  {request.daysCount || request.days || 0} {(request.daysCount || request.days || 0) === 1 ? 'day' : 'days'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{formatDate(request.createdAt || request.appliedAt)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge 
                                variant={request.status === 'approved' ? 'default' : 
                                        request.status === 'rejected' ? 'destructive' : 'secondary'}
                                className="font-medium"
                              >
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(request.status)}
                                  <span>{statusConfig[request.status]?.label || request.status}</span>
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4 max-w-xs">
                              <div className="space-y-1">
                                <p className="text-sm font-medium truncate" title={request.reason}>
                                  {request.reason || 'No reason provided'}
                                </p>
                                {request.reason && request.reason.length > 30 && (
                                  <p className="text-xs text-muted-foreground">Click to view full reason</p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Enhanced Mobile Card View */}
                <div className="lg:hidden space-y-4">
                  {filteredRequests.map((request) => (
                    <Card key={request.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            {user?.role === 'manager' && (
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                                  {request.employee ? 
                                    `${request.employee.firstName?.[0] || ''}${request.employee.lastName?.[0] || ''}` : 
                                    'U'
                                  }
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div>
                              <p className="font-semibold">{leaveTypeLabels[request.leaveType] || request.leaveType}</p>
                              {user?.role === 'manager' && request.employee && (
                                <p className="text-sm text-muted-foreground">
                                  {request.employee.firstName} {request.employee.lastName}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge 
                            variant={request.status === 'approved' ? 'default' : 
                                    request.status === 'rejected' ? 'destructive' : 'secondary'}
                            className="font-medium"
                          >
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(request.status)}
                              <span className="text-xs">{statusConfig[request.status]?.label || request.status}</span>
                            </div>
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1">
                            <p className="text-muted-foreground font-medium">Duration</p>
                            <p className="font-medium">{formatDate(request.startDate)} - {formatDate(request.endDate)}</p>
                            <p className="text-xs text-muted-foreground">{request.daysCount || request.days || 0} days</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-muted-foreground font-medium">Applied</p>
                            <p>{formatDate(request.createdAt || request.appliedAt)}</p>
                          </div>
                        </div>
                        
                        {request.reason && (
                          <div className="space-y-1">
                            <p className="text-muted-foreground font-medium text-sm">Reason</p>
                            <p className="text-sm bg-muted/30 p-3 rounded-lg">{request.reason}</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeaveHistory;