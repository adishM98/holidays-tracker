// Mock data removed - now using API calls for all leave requests

export const leaveTypeLabels = {
  sick: 'Sick Leave',
  casual: 'Casual Leave',
  earned: 'Earned/Privilege Leave',
  compensation: 'Compensation Off'
};

export const statusConfig = {
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