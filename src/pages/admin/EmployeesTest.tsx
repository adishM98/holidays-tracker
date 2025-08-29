import React, { useState, useEffect } from 'react';
import { Plus, Users, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/services/api';

const EmployeesTest: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
      console.log('Starting to load data...');
      setIsLoading(true);
      setError(null);
      
      const [employeesResponse, departmentsResponse] = await Promise.all([
        adminAPI.getEmployees(1, 100),
        adminAPI.getDepartments(),
      ]);
      
      console.log('Raw employees response:', employeesResponse);
      console.log('Raw departments response:', departmentsResponse);
      
      const employeesList = employeesResponse.employees || employeesResponse.data || employeesResponse || [];
      console.log('Processed employees list:', employeesList);
      
      setEmployees(employeesList);
      setDepartments(departmentsResponse || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
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

  const handleAddEmployee = async () => {
    try {
      // Basic validation
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.departmentId || !formData.position) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields (First Name, Last Name, Email, Department, Position).",
          variant: "destructive",
        });
        return;
      }

      console.log('Submitting employee data:', formData);
      
      await adminAPI.createEmployee({
        ...formData,
        managerId: formData.managerId || undefined,
      });
      
      toast({
        title: "Success",
        description: "Employee added successfully.",
      });
      
      setIsDialogOpen(false);
      resetForm();
      loadData(); // Reload the employee list
    } catch (error: any) {
      console.error('Error adding employee:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add employee.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEmployee = async (employee: any) => {
    if (!confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`)) {
      return;
    }

    try {
      await adminAPI.deleteEmployee(employee.id);
      
      toast({
        title: "Success",
        description: "Employee deleted successfully.",
      });
      
      loadData(); // Reload the employee list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee.",
        variant: "destructive",
      });
    }
  };

  console.log('Component state - employees:', employees, 'isLoading:', isLoading, 'error:', error);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Employees (Loading...)</h1>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading employees...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Employees (Error)</h1>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error: {error}
              <br />
              <Button onClick={loadData} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employees</h1>
          <p className="text-muted-foreground">Manage employee records and assignments</p>
        </div>
        
        <Button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Add Employee button clicked');
            setIsDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        console.log('Dialog state changing to:', open);
        setIsDialogOpen(open);
        if (!open) {
          resetForm(); // Reset form when dialog closes
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
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
                    {employees.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.firstName} {manager.lastName} - {manager.department?.name}
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
              <Button 
                variant="outline"
                className="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500" 
                onClick={() => setIsDialogOpen(false)}
                className=""
              >
                Cancel
              </Button>
              <Button onClick={handleAddEmployee}>
                Add Employee
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee List Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Employee List ({employees.length} employees)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No employees found
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">S.No.</TableHead>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee, index) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {employee.firstName} {employee.lastName}
                        </div>
                      </TableCell>
                      <TableCell>{employee.user?.email || employee.email}</TableCell>
                      <TableCell>{employee.department?.name || 'No Department'}</TableCell>
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
                            onClick={() => console.log('Edit employee:', employee)}
                          >
                            <Edit className="w-4 h-4" />
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeesTest;