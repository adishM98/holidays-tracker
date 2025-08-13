import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LeaveType } from '@/types';
import { Calendar, Clock, FileText } from 'lucide-react';
import { leaveTypeLabels } from '@/data/mockData';

const ApplyLeave: React.FC = () => {
  const [leaveType, setLeaveType] = useState<LeaveType | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!leaveType || !startDate || !endDate || !reason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      toast({
        title: "Invalid Date Range",
        description: "End date must be after start date.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: "Leave Request Submitted",
        description: `Your ${leaveTypeLabels[leaveType as LeaveType]} request has been submitted for approval.`,
      });

      navigate('/dashboard');
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Failed to submit leave request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const days = calculateDays();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">Apply for Leave</h1>
        <p className="text-muted-foreground mt-2">Submit a new leave request</p>
      </div>

      <Card className="shadow-professional-lg border-0 bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-6 w-6 mr-2 text-primary" />
            Leave Request Form
          </CardTitle>
          <CardDescription>
            Fill out the details below to submit your leave request
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="leaveType">Leave Type *</Label>
                <Select value={leaveType} onValueChange={(value) => setLeaveType(value as LeaveType)}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(leaveTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duration</Label>
                <div className="flex items-center space-x-2 p-3 bg-secondary/50 rounded-lg">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {days > 0 ? `${days} day${days > 1 ? 's' : ''}` : 'Select dates'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="bg-background/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().split('T')[0]}
                  className="bg-background/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Please provide a reason for your leave request..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-background/50 min-h-[100px]"
                required
              />
            </div>

            {/* Leave Balance Info */}
            {leaveType && user?.leaveBalance && (
              <div className="p-4 bg-accent-light rounded-lg">
                <p className="text-sm text-accent font-medium mb-2">Current Balance:</p>
                <div className="flex items-center space-x-4 text-sm">
                  <span>
                    {leaveType === 'paid' && `Paid Leave: ${user.leaveBalance.paid} days`}
                    {leaveType === 'sick' && `Sick Leave: ${user.leaveBalance.sick} days`}
                    {leaveType === 'casual' && `Casual Leave: ${user.leaveBalance.casual} days`}
                    {!['paid', 'sick', 'casual'].includes(leaveType) && 'No specific balance limit'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-primary hover:opacity-90 transition-smooth"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApplyLeave;