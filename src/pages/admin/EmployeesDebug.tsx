import React, { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Upload, Info, Clipboard, MoreHorizontal, Key, CheckCircle, UserX, UserCheck, RefreshCw, Clock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/services/api';

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  joiningDate: string;
  annualLeaveDays: number;
  sickLeaveDays: number;
  casualLeaveDays: number;
  department: {
    id: string;
    name: string;
  };
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  user?: {
    email: string;
    isActive: boolean;
    inviteStatus: 'invited' | 'invite_expired' | 'active' | null;
    invitedAt: string;
    inviteExpiresAt: string;
  };
}

interface Department {
  id: string;
  name: string;
}

const EmployeesDebug: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [useManualBalances, setUseManualBalances] = useState(false);
  const [isLeaveStatusDialogOpen, setIsLeaveStatusDialogOpen] = useState(false);
  const [leaveStatusEmployee, setLeaveStatusEmployee] = useState<Employee | null>(null);
  const [leaveStatus, setLeaveStatus] = useState<any>(null);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string>('');
  const [resetEmployee, setResetEmployee] = useState<Employee | null>(null);
  const [isOffboardDialogOpen, setIsOffboardDialogOpen] = useState(false);
  const [offboardEmployee, setOffboardEmployee] = useState<Employee | null>(null);
  const [isOffboarding, setIsOffboarding] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  console.log('EmployeesDebug rendering - isAddDialogOpen:', isAddDialogOpen);
  console.log('Current departments state:', departments);

  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    departmentId: '',
    position: '',
    managerId: '',
    joiningDate: new Date(),
    annualLeaveDays: 12,
    sickLeaveDays: 8,
    casualLeaveDays: 8,
    // Manual balance overrides for existing employees
    manualEarnedBalance: 0,
    manualSickBalance: 0,
    manualCasualBalance: 0,
  });

  const resetForm = () => {
    setFormData({
      employeeId: '',
      firstName: '',
      lastName: '',
      email: '',
      departmentId: '',
      position: '',
      managerId: '',
      joiningDate: new Date(),
      annualLeaveDays: 12,
      sickLeaveDays: 8,
      casualLeaveDays: 8,
      manualEarnedBalance: 0,
      manualSickBalance: 0,
      manualCasualBalance: 0,
    });
    setEditingEmployee(null);
    setUseManualBalances(false);
  };

  const handleOpenAddDialog = async () => {
    console.log('Opening Add Employee dialog');
    await fetchDepartments(); // Refresh departments when opening dialog
    resetForm(); // Reset form with empty fields
    setIsAddDialogOpen(true);
  };

  const populateFormForEdit = async (employee: Employee) => {
    console.log('Populating form for employee:', employee);
    
    try {
      // Fetch current leave balances to determine if manual balances were used
      const balanceData = await adminAPI.getEmployeeLeaveBalance(employee.id);
      const balances = balanceData.balances || [];
      const earnedBalance = balances.find(b => b.leaveType === 'earned');
      const sickBalance = balances.find(b => b.leaveType === 'sick');
      const casualBalance = balances.find(b => b.leaveType === 'casual');

      // Check if this employee was created with manual balances by comparing
      // current available days with what pro-rata calculation would give
      const calculateExpectedLeave = (joiningDate: string, leaveType: 'earned' | 'casual' | 'sick'): number => {
        if (!joiningDate) {
          return leaveType === 'earned' ? 12 : 8;
        }
        const joinDate = new Date(joiningDate);
        const joiningMonth = joinDate.getMonth() + 1;
        
        const hrProRataTable = {
          earned: { 1: 12, 2: 11, 3: 10, 4: 9, 5: 8, 6: 7, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 },
          casual: { 1: 8, 2: 7, 3: 7, 4: 6, 5: 6, 6: 5, 7: 4, 8: 4, 9: 3, 10: 2, 11: 2, 12: 1 },
          sick: { 1: 8, 2: 7, 3: 7, 4: 6, 5: 6, 6: 5, 7: 4, 8: 4, 9: 3, 10: 2, 11: 2, 12: 1 }
        };
        
        return hrProRataTable[leaveType][joiningMonth] || 0;
      };

      const expectedEarned = calculateExpectedLeave(employee.joiningDate, 'earned');
      const expectedCasual = calculateExpectedLeave(employee.joiningDate, 'casual');
      const expectedSick = calculateExpectedLeave(employee.joiningDate, 'sick');

      // If available days differ significantly from expected, assume manual balances were used
      const earnedDiffers = Math.abs((earnedBalance?.availableDays || 0) - expectedEarned) > 0.1;
      const casualDiffers = Math.abs((casualBalance?.availableDays || 0) - expectedCasual) > 0.1;
      const sickDiffers = Math.abs((sickBalance?.availableDays || 0) - expectedSick) > 0.1;
      
      const wasManuallySet = earnedDiffers || casualDiffers || sickDiffers;

      setFormData({
        employeeId: employee.employeeId || '',
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email || employee.user?.email || '',
        departmentId: employee.department.id,
        position: employee.position,
        managerId: employee.manager?.id || 'none',
        joiningDate: new Date(employee.joiningDate),
        annualLeaveDays: employee.annualLeaveDays,
        sickLeaveDays: employee.sickLeaveDays,
        casualLeaveDays: employee.casualLeaveDays,
        manualEarnedBalance: earnedBalance?.availableDays || 0,
        manualSickBalance: sickBalance?.availableDays || 0,
        manualCasualBalance: casualBalance?.availableDays || 0,
      });

      setUseManualBalances(wasManuallySet);
      console.log('Form data populated with manual balances detected:', wasManuallySet);
      
    } catch (error) {
      console.error('Failed to fetch balance data for edit form:', error);
      // Fallback to basic form population without balance data
      setFormData({
        employeeId: employee.employeeId || '',
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email || employee.user?.email || '',
        departmentId: employee.department.id,
        position: employee.position,
        managerId: employee.manager?.id || 'none',
        joiningDate: new Date(employee.joiningDate),
        annualLeaveDays: employee.annualLeaveDays,
        sickLeaveDays: employee.sickLeaveDays,
        casualLeaveDays: employee.casualLeaveDays,
        manualEarnedBalance: 0,
        manualSickBalance: 0,
        manualCasualBalance: 0,
      });
      setUseManualBalances(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      console.log('Fetching employees...');
      const response = await adminAPI.getEmployees();
      console.log('Employees API response:', response);
      console.log('Employees data:', response.data);
      // The API returns { employees: [...], total, page, limit }
      const employeesList = response.data?.employees || response.employees || [];
      console.log('Processed employees list:', employeesList);
      setEmployees(employeesList);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive",
      });
    }
  };

  const fetchDepartments = async () => {
    try {
      console.log('Fetching departments...');
      const response = await adminAPI.getDepartments();
      console.log('Departments API response:', response);
      console.log('Departments data:', response.data);
      // Handle both response.data and direct response array formats
      const departmentsList = response.data || response || [];
      console.log('Processed departments list:', departmentsList);
      setDepartments(departmentsList);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch departments",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingEmployee) {
        // Update existing employee
        const employeeData = {
          employeeId: formData.employeeId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          position: formData.position,
          departmentId: formData.departmentId,
          managerId: formData.managerId && formData.managerId !== 'none' ? formData.managerId : undefined,
          joiningDate: formData.joiningDate instanceof Date ? formData.joiningDate.toISOString().split('T')[0] : formData.joiningDate,
          annualLeaveDays: formData.annualLeaveDays,
          sickLeaveDays: formData.sickLeaveDays,
          casualLeaveDays: formData.casualLeaveDays,
        };

        console.log('Updating employee data for ID:', editingEmployee.id);
        console.log('Update payload:', employeeData);
        const response = await adminAPI.updateEmployee(editingEmployee.id, employeeData);
        console.log('Update response:', response);
        
        toast({
          title: "Success",
          description: "Employee updated successfully",
        });

        // Refresh the employee list immediately after successful update
        console.log('Refreshing employee list after update...');
        await fetchEmployees();
        console.log('Employee list refreshed');
      } else {
        // Check for duplicate name when adding new employee
        const existingEmployee = employees.find(emp => 
          emp.firstName.toLowerCase() === formData.firstName.toLowerCase() &&
          emp.lastName.toLowerCase() === formData.lastName.toLowerCase()
        );
        
        if (existingEmployee) {
          toast({
            title: "Error",
            description: "An employee with this name already exists",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Create new employee
        const employeeData = {
          employeeId: formData.employeeId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          position: formData.position,
          departmentId: formData.departmentId,
          managerId: formData.managerId && formData.managerId !== 'none' ? formData.managerId : undefined,
          joiningDate: formData.joiningDate instanceof Date ? formData.joiningDate.toISOString().split('T')[0] : formData.joiningDate,
          annualLeaveDays: formData.annualLeaveDays,
          sickLeaveDays: formData.sickLeaveDays,
          casualLeaveDays: formData.casualLeaveDays,
          // Include manual balance overrides if using manual mode
          useManualBalances,
          manualBalances: useManualBalances ? {
            earned: formData.manualEarnedBalance,
            sick: formData.manualSickBalance,
            casual: formData.manualCasualBalance,
          } : undefined,
        };

        console.log('Creating employee data:', employeeData);
        await adminAPI.createEmployee(employeeData);
        
        toast({
          title: "Success",
          description: "Employee added successfully",
        });

        // Refresh the employee list after creation
        console.log('Refreshing employee list after creation...');
        await fetchEmployees();
        console.log('Employee list refreshed after creation');
      }

      // Close dialog and reset form
      resetForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error saving employee:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast({
        title: "Error",
        description: editingEmployee ? "Failed to update employee" : "Failed to add employee",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | Date) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Calculate pro-rata leave based on HR-provided table
  const calculateProRataLeave = (joiningDate: string, leaveType: 'earned' | 'casual' | 'sick'): number => {
    if (!joiningDate) {
      // Return default values if no joining date
      return leaveType === 'earned' ? 12 : 8;
    }
    
    const joinDate = new Date(joiningDate);
    const joiningMonth = joinDate.getMonth() + 1; // 1-based month (Jan=1, Dec=12)
    
    // HR-provided pro-rata table based on month of joining
    const hrProRataTable = {
      // Privilege/Earned Leave (annual = 12 days)
      earned: {
        1: 12, 2: 11, 3: 10, 4: 9, 5: 8, 6: 7, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1
      },
      // Casual Leave (annual = 8 days)  
      casual: {
        1: 8, 2: 7, 3: 7, 4: 6, 5: 6, 6: 5, 7: 4, 8: 4, 9: 3, 10: 2, 11: 2, 12: 1
      },
      // Sick Leave (annual = 8 days)
      sick: {
        1: 8, 2: 7, 3: 7, 4: 6, 5: 6, 6: 5, 7: 4, 8: 4, 9: 3, 10: 2, 11: 2, 12: 1
      }
    };
    
    return hrProRataTable[leaveType][joiningMonth] || 0;
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await adminAPI.bulkImportEmployees(file);
      toast({
        title: "Success",
        description: "Employees imported successfully",
      });
      fetchEmployees();
    } catch (error) {
      console.error('Error importing employees:', error);
      toast({
        title: "Error",
        description: "Failed to import employees",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const generateInviteURL = (employee: Employee) => {
    // Generate a secure invite token (in a real implementation, this would be generated on the backend)
    // Use | as delimiter since it's unlikely to appear in IDs or emails
    const tokenData = `${employee.id}|${employee.email}|${Date.now()}`;
    // Use URL-safe base64 encoding to avoid issues with + and = characters
    const inviteToken = btoa(tokenData).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const baseURL = window.location.origin;
    const inviteURL = `${baseURL}/invite?token=${inviteToken}&email=${encodeURIComponent(employee.email)}`;
    console.log('Generated invite URL:', inviteURL); // Debug log
    console.log('Token data:', tokenData); // Debug log
    return inviteURL;
  };

  const copyInviteURL = async (employee: Employee) => {
    try {
      const inviteURL = generateInviteURL(employee);
      await navigator.clipboard.writeText(inviteURL);
      
      toast({
        title: "Invite URL Copied",
        description: `Invite URL for ${employee.firstName} ${employee.lastName} has been copied to clipboard`,
      });
    } catch (error) {
      console.error('Failed to copy invite URL:', error);
      toast({
        title: "Error",
        description: "Failed to copy invite URL to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleEditEmployee = async (employee: Employee) => {
    setEditingEmployee(employee);
    await populateFormForEdit(employee);
    fetchDepartments(); // Refresh departments
    setIsAddDialogOpen(true);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setDeleteEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteEmployee = async () => {
    if (!deleteEmployee) return;

    try {
      setIsDeleting(true);
      await adminAPI.deleteEmployee(deleteEmployee.id);
      
      toast({
        title: "Employee Deleted",
        description: `${deleteEmployee.firstName} ${deleteEmployee.lastName} has been permanently deleted`,
      });
      
      fetchEmployees(); // Refresh the list
      setIsDeleteDialogOpen(false);
      setDeleteEmployee(null);
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetPassword = async (employee: Employee) => {
    setResetEmployee(employee);
    setTempPassword('');
    setIsPasswordResetDialogOpen(true);
    
    try {
      // Generate temporary password
      const response = await adminAPI.resetEmployeePassword(employee.id);
      setTempPassword(response.tempPassword);
      
      toast({
        title: "Password Reset Successful",
        description: `Temporary password generated for ${employee.firstName} ${employee.lastName}`,
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive",
      });
      setIsPasswordResetDialogOpen(false);
    }
  };

  const copyTempPassword = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      toast({
        title: "Password Copied",
        description: "Temporary password has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy password to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleOffboardEmployee = (employee: Employee) => {
    setOffboardEmployee(employee);
    setIsOffboardDialogOpen(true);
  };

  const confirmOffboardEmployee = async () => {
    if (!offboardEmployee) return;

    try {
      setIsOffboarding(true);
      await adminAPI.deactivateEmployee(offboardEmployee.id);
      
      toast({
        title: "Employee Off-boarded",
        description: `${offboardEmployee.firstName} ${offboardEmployee.lastName} has been off-boarded successfully`,
      });
      
      fetchEmployees(); // Refresh the list
      setIsOffboardDialogOpen(false);
      setOffboardEmployee(null);
    } catch (error) {
      console.error('Error off-boarding employee:', error);
      toast({
        title: "Error",
        description: "Failed to off-board employee",
        variant: "destructive",
      });
    } finally {
      setIsOffboarding(false);
    }
  };

  const handleActivateEmployee = async (employee: Employee) => {
    try {
      await adminAPI.activateEmployee(employee.id);
      toast({
        title: "Employee Activated",
        description: `${employee.firstName} ${employee.lastName} has been activated successfully`,
      });
      fetchEmployees(); // Refresh the list
    } catch (error) {
      console.error('Error activating employee:', error);
      toast({
        title: "Error",
        description: "Failed to activate employee",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateInvite = async (employee: Employee) => {
    try {
      await adminAPI.regenerateInvite(employee.id);
      toast({
        title: "Invite Regenerated",
        description: `New invite has been generated for ${employee.firstName} ${employee.lastName}`,
      });
      fetchEmployees(); // Refresh the list
    } catch (error) {
      console.error('Error regenerating invite:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate invite",
        variant: "destructive",
      });
    }
  };

  const showLeaveStatus = async (employee: Employee) => {
    setLeaveStatusEmployee(employee);
    setLeaveStatus(null); // Reset previous data
    setIsLeaveStatusDialogOpen(true);
    
    try {
      // Fetch actual leave balance data from the database
      const balanceData = await adminAPI.getEmployeeLeaveBalance(employee.id);
      
      // Fetch leave requests to check current status
      const leaveRequestsData = await adminAPI.getAllLeaveRequests();
      const employeeRequests = leaveRequestsData?.requests?.filter(req => req.employee?.id === employee.id) || [];
      const pendingRequests = employeeRequests.filter(req => req.status === 'pending').length;
      
      // Check if employee is currently on leave (approved request covering today's date)
      const today = new Date().toISOString().split('T')[0];
      const currentLeaveRequest = employeeRequests.find(req => 
        req.status === 'approved' && 
        req.startDate <= today && 
        req.endDate >= today
      );

      // Use actual balance data from database instead of manual calculation
      const balances = balanceData.balances || [];
      const earnedBalance = balances.find(b => b.leaveType === 'earned');
      const sickBalance = balances.find(b => b.leaveType === 'sick');
      const casualBalance = balances.find(b => b.leaveType === 'casual');

      const leaveStatus = {
        earnedLeave: {
          total: earnedBalance?.totalAllocated || employee.annualLeaveDays,
          used: earnedBalance?.usedDays || 0,
          remaining: earnedBalance?.availableDays || employee.annualLeaveDays
        },
        sickLeave: {
          total: sickBalance?.totalAllocated || employee.sickLeaveDays,
          used: sickBalance?.usedDays || 0,
          remaining: sickBalance?.availableDays || employee.sickLeaveDays
        },
        casualLeave: {
          total: casualBalance?.totalAllocated || employee.casualLeaveDays,
          used: casualBalance?.usedDays || 0,
          remaining: casualBalance?.availableDays || employee.casualLeaveDays
        },
        currentStatus: currentLeaveRequest ? `On ${currentLeaveRequest.leaveType} leave` : 'Available',
        onLeave: !!currentLeaveRequest,
        pendingRequests: pendingRequests
      };

      setLeaveStatus(leaveStatus);
    } catch (error) {
      console.error('Failed to fetch leave status:', error);
      // Fallback to basic data from employee record
      const fallbackStatus = {
        earnedLeave: {
          total: employee.annualLeaveDays,
          used: 0,
          remaining: employee.annualLeaveDays
        },
        sickLeave: {
          total: employee.sickLeaveDays,
          used: 0,
          remaining: employee.sickLeaveDays
        },
        casualLeave: {
          total: employee.casualLeaveDays,
          used: 0,
          remaining: employee.casualLeaveDays
        },
        currentStatus: 'Available',
        onLeave: false,
        pendingRequests: 0
      };
      setLeaveStatus(fallbackStatus);
      
      toast({
        title: "Warning",
        description: "Could not load complete leave data. Showing basic information.",
        variant: "default",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Employees</h1>
        <div className="flex items-center space-x-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleBulkUpload}
            className="hidden"
          />
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Bulk Import'}
          </Button>
          
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Add Employee button clicked!');
              handleOpenAddDialog();
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial No.</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Employee Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee, index) => (
                <TableRow key={employee.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{employee.employeeId || 'N/A'}</TableCell>
                  <TableCell>{`${employee.firstName} ${employee.lastName}`}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.department.name}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>
                    {employee.manager 
                      ? `${employee.manager.firstName} ${employee.manager.lastName}` 
                      : 'No Manager'
                    }
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        employee.user?.inviteStatus === 'active' && employee.user?.isActive ? "default" : 
                        employee.user?.inviteStatus === 'invited' ? "secondary" : 
                        employee.user?.inviteStatus === 'invite_expired' ? "destructive" :
                        !employee.user?.isActive ? "destructive" : "default"
                      }
                      className={
                        employee.user?.inviteStatus === 'active' && employee.user?.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-200" : 
                        employee.user?.inviteStatus === 'invited' 
                          ? "bg-blue-100 text-blue-800 hover:bg-blue-200" :
                        employee.user?.inviteStatus === 'invite_expired' 
                          ? "bg-orange-100 text-orange-800 hover:bg-orange-200" :
                        !employee.user?.isActive 
                          ? "bg-red-100 text-red-800 hover:bg-red-200" 
                          : "bg-green-100 text-green-800 hover:bg-green-200"
                      }
                    >
                      {employee.user?.inviteStatus === 'active' && employee.user?.isActive ? 'Active' :
                       employee.user?.inviteStatus === 'invited' ? 'Invited' :
                       employee.user?.inviteStatus === 'invite_expired' ? 'Invite Expired' :
                       !employee.user?.isActive ? 'Offboarded' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {/* Main visible actions */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyInviteURL(employee)}
                        title="Copy Invite URL"
                        className="text-green-600 hover:text-green-700"
                      >
                        <Clipboard className="w-4 h-4" />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => showLeaveStatus(employee)}
                        title="View Leave Status"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      
                      {/* More actions dropdown */}
                      <DropdownMenu 
                        open={openDropdownId === employee.id}
                        onOpenChange={(open) => setOpenDropdownId(open ? employee.id : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" title="More actions">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            handleEditEmployee(employee);
                            setOpenDropdownId(null);
                          }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Employee
                          </DropdownMenuItem>
                          
                          {employee.user?.inviteStatus === 'active' && (
                            <DropdownMenuItem onClick={() => {
                              handleResetPassword(employee);
                              setOpenDropdownId(null);
                            }}>
                              <Key className="w-4 h-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                          )}
                          
                          {employee.user?.inviteStatus === 'invite_expired' && (
                            <DropdownMenuItem 
                              onClick={() => {
                                handleRegenerateInvite(employee);
                                setOpenDropdownId(null);
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Regenerate Invite
                            </DropdownMenuItem>
                          )}
                          
                          {employee.user?.inviteStatus === 'active' && employee.user?.isActive ? (
                            <DropdownMenuItem 
                              onClick={() => {
                                handleOffboardEmployee(employee);
                                setOpenDropdownId(null);
                              }}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Off-board Employee
                            </DropdownMenuItem>
                          ) : employee.user?.inviteStatus === 'invited' ? (
                            <DropdownMenuItem className="text-muted-foreground opacity-50 cursor-not-allowed">
                              <Clock className="w-4 h-4 mr-2" />
                              Pending Invite
                            </DropdownMenuItem>
                          ) : !employee.user?.isActive ? (
                            <DropdownMenuItem 
                              onClick={() => {
                                handleActivateEmployee(employee);
                                setOpenDropdownId(null);
                              }}
                              className="text-green-600 hover:text-green-700"
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Reactivate Employee
                            </DropdownMenuItem>
                          ) : null}
                          
                          <DropdownMenuItem 
                            onClick={() => {
                              handleDeleteEmployee(employee);
                              setOpenDropdownId(null);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Employee
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500">
                    No employees found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddEmployee} className="space-y-4">
            {/* Personal Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="employeeId">Employee ID *</Label>
              <Input
                id="employeeId"
                value={formData.employeeId}
                onChange={(e) => handleInputChange('employeeId', e.target.value)}
                placeholder="Enter employee ID (e.g., EMP001)"
                required
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                placeholder="Enter email address"
              />
            </div>

            {/* Department and Position */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(value) => handleInputChange('departmentId', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Manager Assignment */}
            <div>
              <Label htmlFor="manager">Manager (Optional)</Label>
              <Select
                value={formData.managerId}
                onValueChange={(value) => handleInputChange('managerId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {`${emp.firstName} ${emp.lastName} - ${emp.position}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Joining Date */}
            <div>
              <Label htmlFor="joiningDate">Joining Date</Label>
              <Input
                type="date"
                id="joiningDate"
                value={formData.joiningDate ? formData.joiningDate.toISOString().split('T')[0] : ''}
                onChange={(e) => handleInputChange('joiningDate', e.target.value ? new Date(e.target.value) : undefined)}
                className="w-full"
              />
            </div>

            {/* Leave Entitlements */}
            <div className="border rounded p-4">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-lg">Leave Entitlements</h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="manualBalances"
                    checked={useManualBalances}
                    onChange={(e) => setUseManualBalances(e.target.checked)}
                    className="w-4 h-4 mt-0.5"
                  />
                  <Label htmlFor="manualBalances" className="text-sm cursor-pointer text-right leading-tight">
                    Existing Employee (Set current balances manually)
                  </Label>
                </div>
              </div>

              {!useManualBalances ? (
                <>
                  {/* Annual Allocation Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="annualLeave" className="text-sm font-medium">
                        Earned/Privilege Days
                      </Label>
                      <Input
                        id="annualLeave"
                        type="number"
                        min="0"
                        value={formData.annualLeaveDays}
                        onChange={(e) => handleInputChange('annualLeaveDays', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sickLeave" className="text-sm font-medium">
                        Sick Leave Days
                      </Label>
                      <Input
                        id="sickLeave"
                        type="number"
                        min="0"
                        value={formData.sickLeaveDays}
                        onChange={(e) => handleInputChange('sickLeaveDays', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="casualLeave" className="text-sm font-medium">
                        Casual Leave Days
                      </Label>
                      <Input
                        id="casualLeave"
                        type="number"
                        min="0"
                        value={formData.casualLeaveDays}
                        onChange={(e) => handleInputChange('casualLeaveDays', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Manual Current Balance Fields */}
                  <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg border dark:border-orange-800/50 mb-4">
                    <p className="text-sm text-orange-800 dark:text-orange-200 mb-2">
                      <strong>Migration Mode:</strong> Enter the employee's current leave balances from your previous system
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="manualEarned" className="text-sm font-medium">
                        Current Earned/Privilege Balance
                      </Label>
                      <Input
                        id="manualEarned"
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.manualEarnedBalance}
                        onChange={(e) => handleInputChange('manualEarnedBalance', parseFloat(e.target.value) || 0)}
                        placeholder="e.g. 4.5"
                      />
                      <p className="text-xs text-muted-foreground">Available days remaining</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manualSick" className="text-sm font-medium">
                        Current Sick Leave Balance
                      </Label>
                      <Input
                        id="manualSick"
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.manualSickBalance}
                        onChange={(e) => handleInputChange('manualSickBalance', parseFloat(e.target.value) || 0)}
                        placeholder="e.g. 8"
                      />
                      <p className="text-xs text-muted-foreground">Available days remaining</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manualCasual" className="text-sm font-medium">
                        Current Casual Leave Balance
                      </Label>
                      <Input
                        id="manualCasual"
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.manualCasualBalance}
                        onChange={(e) => handleInputChange('manualCasualBalance', parseFloat(e.target.value) || 0)}
                        placeholder="e.g. 2.5"
                      />
                      <p className="text-xs text-muted-foreground">Available days remaining</p>
                    </div>
                  </div>

                  {/* Annual Allocation Fields (still needed for future calculations) */}
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-4">Annual Leave Allocations (for next year)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="annualLeave" className="text-sm font-medium">
                          Earned/Privilege Days
                        </Label>
                        <Input
                          id="annualLeave"
                          type="number"
                          min="0"
                          value={formData.annualLeaveDays}
                          onChange={(e) => handleInputChange('annualLeaveDays', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sickLeave" className="text-sm font-medium">
                          Sick Leave Days
                        </Label>
                        <Input
                          id="sickLeave"
                          type="number"
                          min="0"
                          value={formData.sickLeaveDays}
                          onChange={(e) => handleInputChange('sickLeaveDays', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="casualLeave" className="text-sm font-medium">
                          Casual Leave Days
                        </Label>
                        <Input
                          id="casualLeave"
                          type="number"
                          min="0"
                          value={formData.casualLeaveDays}
                          onChange={(e) => handleInputChange('casualLeaveDays', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Pro-rata Leave Calculation Preview - Only for new employees */}
              {!useManualBalances && formData.joiningDate && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Calculated Leave Entitlements (Pro-rata based on joining date)
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-gray-700 dark:text-gray-300">Earned/Privilege</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {calculateProRataLeave(formData.joiningDate, 'earned')}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        of {formData.annualLeaveDays || 0} days allocated
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-700 dark:text-gray-300">Sick Leave</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {calculateProRataLeave(formData.joiningDate, 'sick')}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        of {formData.sickLeaveDays || 0} days allocated
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-700 dark:text-gray-300">Casual Leave</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {calculateProRataLeave(formData.joiningDate, 'casual')}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        of {formData.casualLeaveDays || 0} days allocated
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
                    * Leave entitlements are calculated using HR-provided pro-rata table based on joining month
                  </p>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  resetForm();
                  setIsAddDialogOpen(false);
                }}
                disabled={isLoading}
                className="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading 
                  ? (editingEmployee ? 'Updating...' : 'Adding...') 
                  : (editingEmployee ? 'Update Employee' : 'Add Employee')
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordResetDialogOpen} onOpenChange={setIsPasswordResetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Password Reset</DialogTitle>
          </DialogHeader>
          {resetEmployee && (
            <div className="space-y-4">
              <div className="text-center border-b pb-4">
                <h3 className="text-lg font-semibold">
                  {resetEmployee.firstName} {resetEmployee.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">{resetEmployee.position}</p>
              </div>
              
              {tempPassword ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 mb-2">
                      <strong>Temporary Password Generated Successfully!</strong>
                    </p>
                    <div className="flex items-center space-x-2">
                      <Input 
                        value={tempPassword} 
                        readOnly 
                        className="font-mono text-center bg-white border-green-300"
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={copyTempPassword}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Clipboard className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>Important:</strong> Share this password securely with the employee. They will be required to change it upon first login.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                  <span className="ml-2 text-sm text-muted-foreground">Generating password...</span>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsPasswordResetDialogOpen(false);
                    setTempPassword('');
                    setResetEmployee(null);
                  }}
                  className=""
                >
                  Close
                </Button>
                {tempPassword && (
                  <Button 
                    onClick={copyTempPassword}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Copy Password
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Off-board Confirmation Dialog */}
      <Dialog open={isOffboardDialogOpen} onOpenChange={setIsOffboardDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center space-x-2">
              <UserX className="h-5 w-5" />
              <span>Off-board Employee</span>
            </DialogTitle>
          </DialogHeader>
          {offboardEmployee && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <UserX className="h-4 w-4" />
                <AlertTitle>Are you sure you want to off-board this employee?</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-2">
                    <div className="font-medium">
                      {offboardEmployee.firstName} {offboardEmployee.lastName}
                    </div>
                    <div className="text-sm">
                      {offboardEmployee.position} • {offboardEmployee.department.name}
                    </div>
                    <div className="text-sm">
                      {offboardEmployee.email}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <p className="font-semibold">This action will:</p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Prevent the employee from logging into the system</li>
                      <li>• Block access to all leave management features</li>
                      <li>• Preserve all historical data and records</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> The employee can be reactivated later if needed. All data will be preserved.
                </AlertDescription>
              </Alert>
              
              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsOffboardDialogOpen(false);
                    setOffboardEmployee(null);
                  }}
                  className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"
                  disabled={isOffboarding}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmOffboardEmployee}
                  disabled={isOffboarding}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {isOffboarding ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Off-boarding...
                    </>
                  ) : (
                    <>
                      <UserX className="h-4 w-4 mr-2" />
                      Off-board Employee
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center space-x-2">
              <Trash2 className="h-5 w-5" />
              <span>Delete Employee</span>
            </DialogTitle>
          </DialogHeader>
          {deleteEmployee && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <Trash2 className="h-4 w-4" />
                <AlertTitle>Are you sure you want to permanently delete this employee?</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-2">
                    <div className="font-medium">
                      {deleteEmployee.firstName} {deleteEmployee.lastName}
                    </div>
                    <div className="text-sm">
                      {deleteEmployee.position} • {deleteEmployee.department.name}
                    </div>
                    <div className="text-sm">
                      {deleteEmployee.email}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <p className="font-semibold">This action will PERMANENTLY:</p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Delete all employee information</li>
                      <li>• Remove all leave history and records</li>
                      <li>• Delete user account and login access</li>
                      <li>• Remove from all department assignments</li>
                      <li>• Clear manager relationships</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
              
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>⚠️ WARNING:</strong> This action cannot be undone! Consider using "Off-board Employee" instead to preserve data while removing access.
                </AlertDescription>
              </Alert>
              
              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteDialogOpen(false);
                    setDeleteEmployee(null);
                  }}
                  className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteEmployee}
                  disabled={isDeleting}
                  className="flex-1 bg-red-700 hover:bg-red-800"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Permanently Delete
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Leave Status Dialog */}
      <Dialog open={isLeaveStatusDialogOpen} onOpenChange={setIsLeaveStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Leave Status</DialogTitle>
          </DialogHeader>
          {leaveStatusEmployee && (
            <div className="space-y-4">
              <div className="text-center border-b pb-4">
                <h3 className="text-lg font-semibold">
                  {leaveStatusEmployee.firstName} {leaveStatusEmployee.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">{leaveStatusEmployee.position}</p>
                {leaveStatus ? (
                  <Badge variant={leaveStatus.onLeave ? "destructive" : "default"} className="mt-2">
                    {leaveStatus.currentStatus}
                  </Badge>
                ) : (
                  <div className="flex items-center justify-center mt-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Loading status...</span>
                  </div>
                )}
              </div>
              
              {leaveStatus && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-blue-900">Earned/Privilege Leave</p>
                      <p className="text-sm text-blue-700">Used: {leaveStatus.earnedLeave.used}/{leaveStatus.earnedLeave.total}</p>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      {leaveStatus.earnedLeave.remaining} left
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-red-900">Sick Leave</p>
                      <p className="text-sm text-red-700">Used: {leaveStatus.sickLeave.used}/{leaveStatus.sickLeave.total}</p>
                    </div>
                    <Badge variant="outline" className="bg-red-100 text-red-800">
                      {leaveStatus.sickLeave.remaining} left
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-green-900">Casual Leave</p>
                      <p className="text-sm text-green-700">Used: {leaveStatus.casualLeave.used}/{leaveStatus.casualLeave.total}</p>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      {leaveStatus.casualLeave.remaining} left
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <div>
                      <p className="font-medium text-purple-900">Compensation Off</p>
                      <p className="text-sm text-purple-700">No balance tracking</p>
                    </div>
                    <Badge variant="outline" className="bg-purple-100 text-purple-800">
                      Available
                    </Badge>
                  </div>
                  
                  {leaveStatus.pendingRequests > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <span className="font-medium">{leaveStatus.pendingRequests}</span> pending leave request(s)
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-end pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsLeaveStatusDialogOpen(false)}
                  className=""
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeesDebug;