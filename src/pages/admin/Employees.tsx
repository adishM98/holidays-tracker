import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Users, Info, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/services/api';
import { TimeManagementBackground } from '@/components/ui/time-management-background';

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: {
    id: string;
    name: string;
  };
  position: string;
  joiningDate: string;
  isActive: boolean;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface Department {
  id: string;
  name: string;
}

const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLeaveStatusDialogOpen, setIsLeaveStatusDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [leaveStatusEmployee, setLeaveStatusEmployee] = useState<Employee | null>(null);
  const [leaveStatus, setLeaveStatus] = useState<any>(null);
  const [useManualBalances, setUseManualBalances] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    departmentId: '',
    position: '',
    managerId: '',
    joiningDate: new Date() as Date,
    annualLeaveDays: 25,
    sickLeaveDays: 12,
    casualLeaveDays: 8,
    // Manual balance overrides for existing employees
    manualEarnedBalance: 0,
    manualSickBalance: 0,
    manualCasualBalance: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    console.log('formData changed:', formData);
  }, [formData]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [employeesResponse, departmentsResponse] = await Promise.all([
        adminAPI.getEmployees(1, 100),
        adminAPI.getDepartments(),
      ]);
      
      console.log('API Response:', employeesResponse);
      console.log('First employee:', employeesResponse.employees?.[0] || employeesResponse.data?.[0]);
      
      setEmployees(employeesResponse.employees || employeesResponse.data || []);
      setDepartments(departmentsResponse);
      
      // Filter potential managers (excluding current employee if editing)
      const potentialManagers = (employeesResponse.employees || employeesResponse.data || [])
        .filter((emp: Employee) => emp.id !== selectedEmployee?.id);
      setManagers(potentialManagers);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: "Error",
        description: "Failed to load employees data. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    try {
      const employeeData = {
        ...formData,
        joiningDate: formData.joiningDate.toISOString().split('T')[0], // Convert Date to string
        managerId: formData.managerId || undefined,
        // Include manual balance overrides if using manual mode
        useManualBalances,
        manualBalances: useManualBalances ? {
          earned: formData.manualEarnedBalance,
          sick: formData.manualSickBalance,
          casual: formData.manualCasualBalance,
        } : undefined,
      };
      
      await adminAPI.createEmployee(employeeData);
      
      toast({
        title: "Success",
        description: "Employee added successfully.",
      });
      
      setIsAddDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add employee.",
        variant: "destructive",
      });
    }
  };

  const handleEditEmployee = async () => {
    if (!selectedEmployee) return;
    
    try {
      await adminAPI.updateEmployee(selectedEmployee.id, {
        ...formData,
        joiningDate: formData.joiningDate.toISOString().split('T')[0], // Convert Date to string
        managerId: formData.managerId || undefined,
      });
      
      toast({
        title: "Success",
        description: "Employee updated successfully.",
      });
      
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`)) {
      return;
    }

    try {
      await adminAPI.deleteEmployee(employee.id);
      
      toast({
        title: "Success",
        description: "Employee deleted successfully.",
      });
      
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee.",
        variant: "destructive",
      });
    }
  };

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
      annualLeaveDays: 25,
      sickLeaveDays: 12,
      casualLeaveDays: 8,
      manualEarnedBalance: 0,
      manualSickBalance: 0,
      manualCasualBalance: 0,
    });
    setUseManualBalances(false);
  };

  const showLeaveStatus = async (employee: Employee) => {
    setLeaveStatusEmployee(employee);
    try {
      // Mock leave status data - in real implementation, fetch from API
      const mockLeaveStatus = {
        annualLeave: {
          total: 25,
          used: 12,
          remaining: 13
        },
        sickLeave: {
          total: 12,
          used: 3,
          remaining: 9
        },
        casualLeave: {
          total: 8,
          used: 2,
          remaining: 6
        },
        currentStatus: 'Available',
        onLeave: false,
        pendingRequests: 1
      };
      setLeaveStatus(mockLeaveStatus);
      setIsLeaveStatusDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch leave status.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (employee: Employee) => {
    console.log('Opening edit dialog for employee:', employee);
    setSelectedEmployee(employee);
    setFormData({
      employeeId: employee.employeeId || '',
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      departmentId: employee.department.id,
      position: employee.position,
      managerId: employee.manager?.id || '',
      joiningDate: new Date(employee.joiningDate),
      annualLeaveDays: 25, // These would come from the API in a real implementation
      sickLeaveDays: 12,
      casualLeaveDays: 8,
      manualEarnedBalance: 0,
      manualSickBalance: 0,
      manualCasualBalance: 0,
    });
    setUseManualBalances(false);
    console.log('Form data set to:', {
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      departmentId: employee.department.id,
      position: employee.position,
      managerId: employee.manager?.id || '',
      joiningDate: employee.joiningDate.split('T')[0],
    });
    setIsEditDialogOpen(true);
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = searchTerm === '' || 
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === '' || 
      employee.department.id === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  });

  const EmployeeForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            placeholder="Enter first name"
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            placeholder="Enter last name"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="employeeId">Employee ID *</Label>
        <Input
          id="employeeId"
          value={formData.employeeId}
          onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
          placeholder="Enter employee ID"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => {
            console.log('Email input changed:', e.target.value);
            setFormData({...formData, email: e.target.value});
          }}
          placeholder="Enter email address"
          required
        />
        <div className="text-xs text-muted-foreground mt-1">
          Current value: "{formData.email}"
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="department">Department *</Label>
          <Select
            value={formData.departmentId}
            onValueChange={(value) => setFormData({...formData, departmentId: value})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="position">Position *</Label>
          <Input
            id="position"
            value={formData.position}
            onChange={(e) => setFormData({...formData, position: e.target.value})}
            placeholder="Enter position"
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="manager">Manager (Optional)</Label>
          <Select
            value={formData.managerId}
            onValueChange={(value) => setFormData({...formData, managerId: value})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select manager" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No manager</SelectItem>
              {managers.map((manager) => (
                <SelectItem key={manager.id} value={manager.id}>
                  {manager.firstName} {manager.lastName} - {manager.department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="joiningDate">Joining Date *</Label>
          <DatePicker
            date={formData.joiningDate}
            onSelect={(date) => setFormData({...formData, joiningDate: date || new Date()})}
            placeholder="Select joining date"
            className="w-full"
          />
        </div>
      </div>
      
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
                  onChange={(e) => setFormData({...formData, annualLeaveDays: parseInt(e.target.value) || 0})}
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
                  onChange={(e) => setFormData({...formData, sickLeaveDays: parseInt(e.target.value) || 0})}
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
                  onChange={(e) => setFormData({...formData, casualLeaveDays: parseInt(e.target.value) || 0})}
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
                  onChange={(e) => setFormData({...formData, manualEarnedBalance: parseFloat(e.target.value) || 0})}
                  placeholder="e.g. 5"
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
                  onChange={(e) => setFormData({...formData, manualSickBalance: parseFloat(e.target.value) || 0})}
                  placeholder="e.g. 4"
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
                  onChange={(e) => setFormData({...formData, manualCasualBalance: parseFloat(e.target.value) || 0})}
                  placeholder="e.g. 4"
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
                    onChange={(e) => setFormData({...formData, annualLeaveDays: parseInt(e.target.value) || 0})}
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
                    onChange={(e) => setFormData({...formData, sickLeaveDays: parseInt(e.target.value) || 0})}
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
                    onChange={(e) => setFormData({...formData, casualLeaveDays: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button 
          variant="outline"
          className="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500" 
          onClick={() => {
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            resetForm();
          }}
          className=""
        >
          Cancel
        </Button>
        <Button onClick={onSubmit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen">
      <TimeManagementBackground />
      <div className="relative z-10 space-y-6">
        {/* Hero Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Employees</h1>
              <p className="text-muted-foreground mt-1 text-sm">Manage all your people and their roles in one place</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" className="bg-white/80 backdrop-blur-sm border-gray-300 hover:bg-gray-50 transition-all duration-200">
              <Upload className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <EmployeeForm onSubmit={handleAddEmployee} submitLabel="Add Employee" />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Employee List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial No.</TableHead>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                            <Users className="h-8 w-8 text-green-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground mb-1">No employees added yet</h3>
                            <p className="text-muted-foreground text-sm">Start by adding your first team member</p>
                          </div>
                          <div className="flex justify-center">
                            <Button 
                              onClick={() => setIsAddDialogOpen(true)}
                              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Employee
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee, index) => (
                      <TableRow key={employee.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                        <TableCell>
                          <div className="font-medium">{employee.employeeId || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{employee.firstName} {employee.lastName}</div>
                        </TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>{employee.department.name}</TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>
                          {employee.manager 
                            ? `${employee.manager.firstName} ${employee.manager.lastName}`
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(employee)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => showLeaveStatus(employee)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Info className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteEmployee(employee)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <EmployeeForm onSubmit={handleEditEmployee} submitLabel="Update Employee" />
        </DialogContent>
      </Dialog>

      <Dialog open={isLeaveStatusDialogOpen} onOpenChange={setIsLeaveStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Leave Status</DialogTitle>
          </DialogHeader>
          {leaveStatusEmployee && leaveStatus && (
            <div className="space-y-4">
              <div className="text-center border-b pb-4">
                <h3 className="text-lg font-semibold">
                  {leaveStatusEmployee.firstName} {leaveStatusEmployee.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">{leaveStatusEmployee.position}</p>
                <Badge variant={leaveStatus.onLeave ? "destructive" : "default"} className="mt-2">
                  {leaveStatus.currentStatus}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium text-blue-900">Annual Leave</p>
                    <p className="text-sm text-blue-700">Used: {leaveStatus.annualLeave.used}/{leaveStatus.annualLeave.total}</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    {leaveStatus.annualLeave.remaining} left
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-green-900">Sick Leave</p>
                    <p className="text-sm text-green-700">Used: {leaveStatus.sickLeave.used}/{leaveStatus.sickLeave.total}</p>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    {leaveStatus.sickLeave.remaining} left
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium text-orange-900">Casual Leave</p>
                    <p className="text-sm text-orange-700">Used: {leaveStatus.casualLeave.used}/{leaveStatus.casualLeave.total}</p>
                  </div>
                  <Badge variant="outline" className="bg-orange-100 text-orange-800">
                    {leaveStatus.casualLeave.remaining} left
                  </Badge>
                </div>
              </div>
              
              {leaveStatus.pendingRequests > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <span className="font-medium">{leaveStatus.pendingRequests}</span> pending leave request(s)
                  </p>
                </div>
              )}
              
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setIsLeaveStatusDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default Employees;