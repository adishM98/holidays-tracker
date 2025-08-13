import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Search, Filter, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { mockLeaveRequests, statusConfig, leaveTypeLabels } from '@/data/mockData';
import { LeaveRequest, LeaveStatus } from '@/types';

const LeaveHistory: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'all'>('all');

  // Filter requests based on user role
  const allRequests = user?.role === 'manager' 
    ? mockLeaveRequests 
    : mockLeaveRequests.filter(req => req.employeeId === user?.id);

  // Apply filters
  const filteredRequests = allRequests.filter(request => {
    const matchesSearch = request.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         leaveTypeLabels[request.leaveType].toLowerCase().includes(searchTerm.toLowerCase());
    
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
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as LeaveStatus | 'all')}>
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
                {filteredRequests.map((request: LeaveRequest) => (
                  <TableRow key={request.id} className="hover:bg-secondary/50 transition-smooth">
                    {user?.role === 'manager' && (
                      <TableCell className="font-medium">{request.employeeName}</TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>{leaveTypeLabels[request.leaveType]}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{formatDate(request.startDate)} - {formatDate(request.endDate)}</p>
                        <p className="text-sm text-muted-foreground">{request.days} days</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDate(request.appliedAt.split('T')[0])}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusConfig[request.status].className}`}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(request.status)}
                          <span>{statusConfig[request.status].label}</span>
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate" title={request.reason}>
                        {request.reason}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredRequests.map((request: LeaveRequest) => (
              <Card key={request.id} className="bg-background/50 border shadow-professional-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-foreground">{leaveTypeLabels[request.leaveType]}</p>
                      {user?.role === 'manager' && (
                        <p className="text-sm text-muted-foreground">{request.employeeName}</p>
                      )}
                    </div>
                    <Badge className={`${statusConfig[request.status].className}`}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(request.status)}
                        <span>{statusConfig[request.status].label}</span>
                      </div>
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Duration:</span>{' '}
                      {formatDate(request.startDate)} - {formatDate(request.endDate)} ({request.days} days)
                    </p>
                    <p>
                      <span className="text-muted-foreground">Applied:</span>{' '}
                      {formatDate(request.appliedAt.split('T')[0])}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Reason:</span>{' '}
                      {request.reason}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No leave requests found</p>
              {searchTerm || statusFilter !== 'all' ? (
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your filters
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveHistory;