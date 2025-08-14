import React, { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Upload, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/services/api';

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
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
  const [isLeaveStatusDialogOpen, setIsLeaveStatusDialogOpen] = useState(false);
  const [leaveStatusEmployee, setLeaveStatusEmployee] = useState<Employee | null>(null);
  const [leaveStatus, setLeaveStatus] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  console.log('EmployeesDebug rendering - isAddDialogOpen:', isAddDialogOpen);
  console.log('Current departments state:', departments);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    departmentId: '',
    position: '',
    managerId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    annualLeaveDays: 12,
    sickLeaveDays: 8,
    casualLeaveDays: 8,
  });

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      departmentId: '',
      position: '',
      managerId: '',
      joiningDate: new Date().toISOString().split('T')[0],
      annualLeaveDays: 12,
      sickLeaveDays: 8,
      casualLeaveDays: 8,
    });
    setEditingEmployee(null);
  };

  const populateFormForEdit = (employee: Employee) => {
    console.log('Populating form for employee:', employee);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.user?.email || '', // Get email from user object
      departmentId: employee.department.id,
      position: employee.position,
      managerId: employee.manager?.id || 'none',
      joiningDate: employee.joiningDate.split('T')[0], // Convert to YYYY-MM-DD format
      annualLeaveDays: employee.annualLeaveDays,
      sickLeaveDays: employee.sickLeaveDays,
      casualLeaveDays: employee.casualLeaveDays,
    });
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
          firstName: formData.firstName,
          lastName: formData.lastName,
          position: formData.position,
          departmentId: formData.departmentId,
          managerId: formData.managerId && formData.managerId !== 'none' ? formData.managerId : undefined,
          joiningDate: formData.joiningDate,
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
          firstName: formData.firstName,
          lastName: formData.lastName,
          employeeId: `EMP${Date.now()}`, // Generate unique employee ID
          position: formData.position,
          departmentId: formData.departmentId,
          managerId: formData.managerId && formData.managerId !== 'none' ? formData.managerId : undefined,
          joiningDate: formData.joiningDate,
          annualLeaveDays: formData.annualLeaveDays,
          sickLeaveDays: formData.sickLeaveDays,
          casualLeaveDays: formData.casualLeaveDays,
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

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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


  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    populateFormForEdit(employee);
    fetchDepartments(); // Refresh departments
    setIsAddDialogOpen(true);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) {
      return;
    }

    try {
      await adminAPI.deleteEmployee(employeeId);
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
      fetchEmployees(); // Refresh the list
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive",
      });
    }
  };

  const showLeaveStatus = async (employee: Employee) => {
    setLeaveStatusEmployee(employee);
    try {
      // Mock leave status data - in real implementation, fetch from API
      // For new employees, show 0 usage and 0 pending requests
      const isNewEmployee = new Date(employee.joiningDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Joined within last 30 days
      
      const mockLeaveStatus = {
        annualLeave: {
          total: employee.annualLeaveDays,
          used: isNewEmployee ? 0 : Math.floor(employee.annualLeaveDays * 0.4),
          remaining: isNewEmployee ? employee.annualLeaveDays : Math.ceil(employee.annualLeaveDays * 0.6)
        },
        sickLeave: {
          total: employee.sickLeaveDays,
          used: isNewEmployee ? 0 : Math.floor(employee.sickLeaveDays * 0.2),
          remaining: isNewEmployee ? employee.sickLeaveDays : Math.ceil(employee.sickLeaveDays * 0.8)
        },
        casualLeave: {
          total: employee.casualLeaveDays,
          used: isNewEmployee ? 0 : Math.floor(employee.casualLeaveDays * 0.3),
          remaining: isNewEmployee ? employee.casualLeaveDays : Math.ceil(employee.casualLeaveDays * 0.7)
        },
        currentStatus: 'Available',
        onLeave: false,
        pendingRequests: isNewEmployee ? 0 : Math.floor(Math.random() * 3)
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Employees</h1>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => {
              console.log('Manual refresh clicked');
              fetchEmployees();
            }}
            size="sm"
          >
            🔄 Refresh
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleBulkUpload}
            className="hidden"
          />
          
          <Button
            variant="outline"
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
              fetchDepartments(); // Refresh departments when opening dialog
              setIsAddDialogOpen(true);
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
                <TableHead>Employee Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee, index) => (
                <TableRow key={employee.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{`${employee.firstName} ${employee.lastName}`}</TableCell>
                  <TableCell>{employee.department.name}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>
                    {employee.manager 
                      ? `${employee.manager.firstName} ${employee.manager.lastName}` 
                      : 'No Manager'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditEmployee(employee)}
                        title="Edit Employee"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => showLeaveStatus(employee)}
                        title="View Leave Status"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteEmployee(employee.id)}
                        title="Delete Employee"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
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
                id="joiningDate"
                type="date"
                value={formData.joiningDate}
                onChange={(e) => handleInputChange('joiningDate', e.target.value)}
                required
              />
            </div>

            {/* Leave Entitlements */}
            <div className="border rounded p-4">
              <h3 className="font-semibold mb-3">Leave Entitlements</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="annualLeave">Annual Leave Days</Label>
                  <Input
                    id="annualLeave"
                    type="number"
                    min="0"
                    value={formData.annualLeaveDays}
                    onChange={(e) => handleInputChange('annualLeaveDays', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="sickLeave">Sick Leave Days</Label>
                  <Input
                    id="sickLeave"
                    type="number"
                    min="0"
                    value={formData.sickLeaveDays}
                    onChange={(e) => handleInputChange('sickLeaveDays', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="casualLeave">Casual Leave Days</Label>
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

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsAddDialogOpen(false);
                }}
                disabled={isLoading}
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

      {/* Leave Status Dialog */}
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

export default EmployeesDebug;