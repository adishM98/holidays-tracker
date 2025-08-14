import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Users, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    departmentId: '',
    position: '',
    managerId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    annualLeaveDays: 25,
    sickLeaveDays: 12,
    casualLeaveDays: 8,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [employeesResponse, departmentsResponse] = await Promise.all([
        adminAPI.getEmployees(1, 100),
        adminAPI.getDepartments(),
      ]);
      
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
      await adminAPI.createEmployee({
        ...formData,
        managerId: formData.managerId || undefined,
      });
      
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
      firstName: '',
      lastName: '',
      email: '',
      departmentId: '',
      position: '',
      managerId: '',
      joiningDate: new Date().toISOString().split('T')[0],
      annualLeaveDays: 25,
      sickLeaveDays: 12,
      casualLeaveDays: 8,
    });
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
    setSelectedEmployee(employee);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      departmentId: employee.department.id,
      position: employee.position,
      managerId: employee.manager?.id || '',
      joiningDate: employee.joiningDate.split('T')[0],
      annualLeaveDays: 25, // These would come from the API in a real implementation
      sickLeaveDays: 12,
      casualLeaveDays: 8,
    });
    setIsEditDialogOpen(true);
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = searchTerm === '' || 
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
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
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          placeholder="Enter email address"
          required
        />
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
          <Input
            id="joiningDate"
            type="date"
            value={formData.joiningDate}
            onChange={(e) => setFormData({...formData, joiningDate: e.target.value})}
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="annualLeave">Annual Leave Days</Label>
          <Input
            id="annualLeave"
            type="number"
            value={formData.annualLeaveDays}
            onChange={(e) => setFormData({...formData, annualLeaveDays: parseInt(e.target.value)})}
            min="0"
            max="50"
          />
        </div>
        <div>
          <Label htmlFor="sickLeave">Sick Leave Days</Label>
          <Input
            id="sickLeave"
            type="number"
            value={formData.sickLeaveDays}
            onChange={(e) => setFormData({...formData, sickLeaveDays: parseInt(e.target.value)})}
            min="0"
            max="30"
          />
        </div>
        <div>
          <Label htmlFor="casualLeave">Casual Leave Days</Label>
          <Input
            id="casualLeave"
            type="number"
            value={formData.casualLeaveDays}
            onChange={(e) => setFormData({...formData, casualLeaveDays: parseInt(e.target.value)})}
            min="0"
            max="20"
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={() => {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          resetForm();
        }}>
          Cancel
        </Button>
        <Button onClick={onSubmit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employees</h1>
          <p className="text-muted-foreground">Manage employee records and assignments</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)}>
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
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No employees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.employeeId}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee.firstName} {employee.lastName}</div>
                          </div>
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
                          <Badge variant={employee.isActive ? "default" : "secondary"}>
                            {employee.isActive ? "Active" : "Inactive"}
                          </Badge>
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
  );
};

export default Employees;