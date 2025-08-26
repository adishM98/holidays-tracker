import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Clock, Check, X, Calendar, User, MessageSquare, Loader2 } from 'lucide-react';
import { leaveTypeLabels } from '@/data/mockData';
import { managerAPI } from '@/services/api';

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pending Approvals</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve team leave requests
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading pending requests...</span>
        </div>
      ) : pendingRequests.length > 0 ? (
        <div className="grid gap-6">
          {pendingRequests.map((request) => (
            <Card key={request.id} className="shadow-professional-md border-0 bg-gradient-card hover:shadow-professional-lg transition-smooth">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {request.employee ? `${request.employee.firstName[0]}${request.employee.lastName[0]}` : 'U'}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {request.employee ? `${request.employee.firstName} ${request.employee.lastName}` : 'Unknown Employee'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Applied {formatDateTime(request.createdAt)}
                        </p>
                      </div>
                      <Badge className="bg-warning-light text-warning border-warning/20">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Pending</span>
                        </div>
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Leave Type</p>
                          <p className="font-medium">{leaveTypeLabels[request.leaveType] || request.leaveType}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-medium">
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </p>
                        <p className="text-sm text-muted-foreground">{request.daysCount || request.days || 0} days</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Reason</p>
                        <p className="font-medium line-clamp-2">{request.reason || 'No reason provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-4 border-t border-border">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                        className="flex items-center space-x-2"
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
                          <p><span className="font-medium">Duration:</span> {formatDate(request.startDate)} - {formatDate(request.endDate)} ({request.daysCount || request.days || 0} days)</p>
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
                    className="bg-gradient-success hover:opacity-90"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Quick Approve
                  </Button>
                  
                  <Button
                    onClick={() => handleApproval(request.id, 'rejected')}
                    disabled={isProcessing}
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
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
        <Card className="shadow-professional-md border-0 bg-gradient-card">
          <CardContent className="py-12">
            <div className="text-center">
              <Check className="h-12 w-12 text-success mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">No pending leave requests to review.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PendingApprovals;