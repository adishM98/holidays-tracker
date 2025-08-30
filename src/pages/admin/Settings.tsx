import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Calendar, Settings as SettingsIcon } from 'lucide-react';
import { adminAPI } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  isRecurring: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface HolidayFormData {
  name: string;
  date: Date | undefined;
  description: string;
  isRecurring: boolean;
  isActive: boolean;
}

const Settings: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState<HolidayFormData>({
    name: '',
    date: undefined,
    description: '',
    isRecurring: false,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Partial<HolidayFormData>>({});

  const { toast } = useToast();

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getHolidays();
      setHolidays(response);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch holidays',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const validateForm = (): boolean => {
    const errors: Partial<HolidayFormData> = {};

    if (!formData.name.trim()) {
      errors.name = 'Holiday name is required';
    }

    if (!formData.date) {
      errors.date = 'Holiday date is required';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today && !editingHoliday) {
        errors.date = 'Cannot create holidays in the past';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Convert Date object to string for API
      const holidayData = {
        ...formData,
        date: formData.date ? formData.date.toISOString().split('T')[0] : ''
      };

      if (editingHoliday) {
        await adminAPI.updateHoliday(editingHoliday.id, holidayData);
        toast({
          title: 'Success',
          description: 'Holiday updated successfully',
        });
      } else {
        await adminAPI.createHoliday(holidayData);
        toast({
          title: 'Success',
          description: 'Holiday created successfully',
        });
      }

      setShowDialog(false);
      setEditingHoliday(null);
      resetForm();
      fetchHolidays();
    } catch (error) {
      console.error('Error saving holiday:', error);
      toast({
        title: 'Error',
        description: editingHoliday ? 'Failed to update holiday' : 'Failed to create holiday',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingHoliday) return;

    try {
      await adminAPI.deleteHoliday(deletingHoliday.id);
      toast({
        title: 'Success',
        description: 'Holiday deleted successfully',
      });
      setDeletingHoliday(null);
      fetchHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete holiday',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      date: undefined,
      description: '',
      isRecurring: false,
      isActive: true,
    });
    setFormErrors({});
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      name: holiday.name,
      date: new Date(holiday.date), // Convert to Date object
      description: holiday.description || '',
      isRecurring: holiday.isRecurring,
      isActive: holiday.isActive,
    });
    setShowDialog(true);
  };

  const handleAdd = () => {
    setEditingHoliday(null);
    resetForm();
    setShowDialog(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
      </div>

      {/* Holiday Management Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Holiday Management</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage company holidays and public holidays
            </p>
          </div>
          <Button onClick={handleAdd} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Holiday</span>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">Loading holidays...</div>
            </div>
          ) : holidays.length === 0 ? (
            <div className="text-center p-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No holidays found</h3>
              <p className="text-muted-foreground">
                Get started by adding your first holiday using the "Add Holiday" button above
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell className="font-medium">{holiday.name}</TableCell>
                    <TableCell>{formatDate(holiday.date)}</TableCell>
                    <TableCell>
                      {holiday.description ? (
                        <span className="text-sm text-muted-foreground">
                          {holiday.description.length > 50
                            ? `${holiday.description.substring(0, 50)}...`
                            : holiday.description}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {holiday.isRecurring ? (
                        <Badge variant="secondary">Recurring</Badge>
                      ) : (
                        <Badge variant="outline">One-time</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {holiday.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                className="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500"
                          size="sm"
                          onClick={() => handleEdit(holiday)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                className="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500"
                          size="sm"
                          onClick={() => setDeletingHoliday(holiday)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Holiday Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
              </DialogTitle>
              <DialogDescription>
                {editingHoliday
                  ? 'Update the holiday information below.'
                  : 'Add a new holiday to the calendar.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <div className="col-span-3">
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Holiday name"
                    className={formErrors.name ? 'border-red-500' : ''}
                  />
                  {formErrors.name && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Date
                </Label>
                <div className="col-span-3">
                  <DatePicker
                    date={formData.date}
                    onSelect={(date) => setFormData({ ...formData, date: date })}
                    placeholder="Select holiday date"
                    className={`w-full ${formErrors.date ? 'border-red-500' : ''}`}
                  />
                  {formErrors.date && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.date}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right mt-2">
                  Description
                </Label>
                <div className="col-span-3">
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Options</Label>
                <div className="col-span-3 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isRecurring"
                      checked={formData.isRecurring}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isRecurring: checked as boolean })
                      }
                    />
                    <Label htmlFor="isRecurring" className="text-sm">
                      Recurring holiday (repeats every year)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isActive: checked as boolean })
                      }
                    />
                    <Label htmlFor="isActive" className="text-sm">
                      Active (visible in calendar)
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setShowDialog(false);
                  setEditingHoliday(null);
                  resetForm();
                }}
                className="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingHoliday ? 'Update Holiday' : 'Add Holiday'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingHoliday} onOpenChange={() => setDeletingHoliday(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingHoliday?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;