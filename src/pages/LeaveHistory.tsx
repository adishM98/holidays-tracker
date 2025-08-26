import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Search, Filter, Calendar, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
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
        // For admin, we don't have a specific endpoint yet
        data = { requests: [] };
      }

      setLeaveRequests(data?.requests || data || []);
    } catch (error) {
      console.error('Failed to fetch leave history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leave history",
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Leave History</h1>
        <p className="text-muted-foreground mt-2">
          {user?.role === 'manager' ? 'All team leave requests' : 'Your leave request history'}
        </p>
      </div>

      <Card className="shadow-professional-lg border-0 bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-6 w-6 mr-2 text-primary" />
            Leave Requests
          </CardTitle>
          <CardDescription>
            View and track all leave applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reason, employee, or leave type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading leave history...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No leave requests found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {user?.role === 'manager' && <TableHead>Employee</TableHead>}
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Applied Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id} className="hover:bg-secondary/50 transition-smooth">
                        {user?.role === 'manager' && (
                          <TableCell className="font-medium">
                            {request.employee ? `${request.employee.firstName} ${request.employee.lastName}` : 'Unknown'}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span>{leaveTypeLabels[request.leaveType] || request.leaveType}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatDate(request.startDate)} - {formatDate(request.endDate)}</p>
                            <p className="text-sm text-muted-foreground">{request.daysCount || request.days || 0} days</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDate(request.createdAt || request.appliedAt)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig[request.status]?.className || statusConfig.pending.className}`}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(request.status)}
                              <span>{statusConfig[request.status]?.label || request.status}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="truncate" title={request.reason}>
                            {request.reason || 'No reason provided'}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveHistory;