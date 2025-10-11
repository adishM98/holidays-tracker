import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Clock, Check, X, Calendar, User, MessageSquare, Loader2, Clipboard, CheckSquare, BarChart3 } from 'lucide-react';
import { leaveTypeLabels } from '@/data/mockData';
import { managerAPI } from '@/services/api';
import { TimeManagementBackground } from '@/components/ui/time-management-background';

const PendingApprovals: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [comments, setComments] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const data = await managerAPI.getTeamRequests(1, 50, 'pending');
      setRequests(data?.requests || []);
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pending requests",
        variant: "destructive",
      });
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const pendingRequests = requests.filter(req => req.status === 'pending');

  const handleApproval = async (requestId: string, action: 'approved' | 'rejected') => {
    setIsProcessing(true);
    
    try {
      if (action === 'approved') {
        await managerAPI.approveLeaveRequest(requestId, comments);
      } else {
        await managerAPI.rejectLeaveRequest(requestId, comments || 'No reason provided');
      }

      const request = requests.find(req => req.id === requestId);
      
      toast({
        title: `Request ${action}`,
        description: `${request?.employee?.firstName} ${request?.employee?.lastName}'s leave request has been ${action}.`,
      });

      setSelectedRequest(null);
      setComments('');
      
      // Refresh the list
      fetchPendingRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to process the request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (startDate: string, endDate: string) => {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    
    // If it's the same date, show only once
    if (start === end) {
      return start;
    }
    
    return `${start} - ${end}`;
  };

  return (
    <div className="relative min-h-screen">
      <TimeManagementBackground />
      <div className="relative z-10 space-y-8">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <CheckSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Pending Approvals</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Review, approve, or reject leave requests from your team
              </p>
            </div>
          </div>
        </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading pending requests...</span>
        </div>
      ) : pendingRequests.length > 0 ? (
        <div className="grid gap-6">
          {pendingRequests.map((request) => (
            <Card key={request.id} className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-blue-950/20 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Employee Info */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                        {request.employee ? `${request.employee.firstName[0]}${request.employee.lastName[0]}` : 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-lg">
                          {request.employee ? `${request.employee.firstName} ${request.employee.lastName}` : 'Unknown Employee'}
                        </p>
                        <p className="text-sm text-blue-600 font-medium">
                          {request.employee?.position || 'Employee'}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Applied leave on {formatDateTime(request.createdAt)}
                    </p>
                  </div>

                  {/* Right Column - Request Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-green-600" />
                        </div>
                        <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1 rounded-full">
                          {leaveTypeLabels[request.leaveType] || request.leaveType}
                        </Badge>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 px-3 py-1 rounded-full flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>Pending</span>
                      </Badge>
                    </div>
                    
                    <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">Duration</p>
                      <p className="font-bold text-foreground">
                        {formatDuration(request.startDate, request.endDate)}
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">({request.daysCount || request.days || 0} days)</p>
                    </div>
                    
                    <div className="bg-gray-50/50 dark:bg-gray-800/20 rounded-lg p-3">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Reason</p>
                      <p className="text-sm italic text-gray-600 dark:text-gray-400 leading-relaxed">
                        "{request.reason || 'No reason provided'}"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-6 mt-4 border-t border-border/50">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                        className="rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 flex items-center space-x-2 px-4"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>Review</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Review Leave Request</DialogTitle>
                        <DialogDescription>
                          Review and approve or reject {request.employee ? `${request.employee.firstName} ${request.employee.lastName}` : 'Unknown Employee'}'s leave request
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
                          <p><span className="font-medium">Employee:</span> {request.employee ? `${request.employee.firstName} ${request.employee.lastName}` : 'Unknown Employee'}</p>
                          <p><span className="font-medium">Leave Type:</span> {leaveTypeLabels[request.leaveType] || request.leaveType}</p>
                          <p><span className="font-medium">Duration:</span> {formatDuration(request.startDate, request.endDate)} ({request.daysCount || request.days || 0} days)</p>
                          <p><span className="font-medium">Reason:</span> {request.reason || 'No reason provided'}</p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-foreground">Comments (Optional)</label>
                          <Textarea
                            placeholder="Add any comments about this decision..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        
                        <div className="flex space-x-3">
                          <Button
                            onClick={() => handleApproval(request.id, 'rejected')}
                            disabled={isProcessing}
                            variant="outline"
                            className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <X className="h-4 w-4 mr-2" />
                            {isProcessing ? 'Processing...' : 'Reject'}
                          </Button>
                          <Button
                            onClick={() => handleApproval(request.id, 'approved')}
                            disabled={isProcessing}
                            className="flex-1 bg-gradient-success hover:opacity-90"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {isProcessing ? 'Processing...' : 'Approve'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    onClick={() => handleApproval(request.id, 'approved')}
                    disabled={isProcessing}
                    size="sm"
                    className="rounded-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-4"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Quick Approve
                  </Button>
                  
                  <Button
                    onClick={() => handleApproval(request.id, 'rejected')}
                    disabled={isProcessing}
                    variant="outline"
                    size="sm"
                    className="rounded-full text-red-600 border-red-200 hover:bg-red-50 px-4"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-green-50/30 dark:from-gray-900 dark:to-green-950/20 backdrop-blur-sm">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clipboard className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">No pending requests</h3>
              <p className="text-muted-foreground text-lg">You're all caught up! 🎉</p>
              <p className="text-muted-foreground text-sm mt-2">When your team submits leave requests, they'll appear here for review.</p>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
};

export default PendingApprovals;