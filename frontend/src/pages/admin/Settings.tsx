import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Switch } from '@/components/ui/switch';
import { TailwindDatePicker } from '@/components/ui/tailwind-date-picker';
import { TimeManagementBackground } from '@/components/ui/time-management-background';
import { Plus, Edit, Trash2, Calendar, Settings as SettingsIcon, PartyPopper, Zap, Search, Info } from 'lucide-react';
import { adminAPI } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  type?: 'company' | 'public';
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
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);
  const [autoApproveLoading, setAutoApproveLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('automation');
  const [searchQuery, setSearchQuery] = useState('');

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

  const fetchAutoApproveStatus = async () => {
    try {
      const response = await adminAPI.getAutoApproveStatus();
      setAutoApproveEnabled(response.enabled);
    } catch (error) {
      console.error('Error fetching auto-approve status:', error);
    }
  };

  const handleAutoApproveToggle = async (enabled: boolean) => {
    try {
      setAutoApproveLoading(true);
      await adminAPI.toggleAutoApprove(enabled);
      setAutoApproveEnabled(enabled);
      toast({
        title: 'Success',
        description: `Auto-approve has been ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error toggling auto-approve:', error);
      toast({
        title: 'Error',
        description: 'Failed to update auto-approve setting',
        variant: 'destructive',
      });
    } finally {
      setAutoApproveLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
    fetchAutoApproveStatus();
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

  // Filter and sort holidays based on search query
  const filteredHolidays = useMemo(() => {
    let filtered = holidays;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (holiday) =>
          holiday.name.toLowerCase().includes(query) ||
          holiday.description?.toLowerCase().includes(query)
      );
    }

    // Sort by date (upcoming first)
    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [holidays, searchQuery]);

  return (
    <div className="relative min-h-screen">
      <TimeManagementBackground />
      <div className="relative z-10 space-y-6 max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <SettingsIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage holidays, approvals, and system configurations</p>
            </div>
          </div>
        </div>

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white dark:bg-gray-900 shadow-sm">
            <TabsTrigger value="automation" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Zap className="h-4 w-4 mr-2" />
              Automation
            </TabsTrigger>
            <TabsTrigger value="holidays" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Calendar className="h-4 w-4 mr-2" />
              Holidays
            </TabsTrigger>
          </TabsList>

          {/* Automation Tab */}
          <TabsContent value="automation" className="space-y-6">
            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-blue-950/20 backdrop-blur-sm">
              <CardHeader className="border-b border-border/50 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Auto-Approval Rules</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      Automatically approve pending leave requests after their start date if not reviewed
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between p-5 border border-blue-200 dark:border-blue-800 rounded-lg bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="auto-approve" className="text-base font-semibold text-foreground">
                        Enable Auto-Approval
                      </Label>
                      <div className="group relative">
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-50">
                          Leave requests will be automatically approved after their start date if not reviewed by a manager
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Automatically approve leave requests that have passed their requested date if not approved by the manager
                    </p>
                  </div>
                  <Switch
                    id="auto-approve"
                    checked={autoApproveEnabled}
                    onCheckedChange={handleAutoApproveToggle}
                    disabled={autoApproveLoading}
                    className="data-[state=checked]:bg-blue-600"
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 pt-4 text-sm text-muted-foreground">
                Status: {autoApproveEnabled ? (
                  <span className="ml-2 text-green-600 dark:text-green-400 font-medium">Active</span>
                ) : (
                  <span className="ml-2 text-gray-600 dark:text-gray-400 font-medium">Inactive</span>
                )}
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Holidays Tab */}
          <TabsContent value="holidays" className="space-y-6">
            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-blue-950/20 backdrop-blur-sm">
              <CardHeader className="border-b border-border/50 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Manage Company Holidays</CardTitle>
                      <CardDescription className="mt-1">
                        Add, edit, and manage company-wide holidays
                      </CardDescription>
                    </div>
                  </div>
                  {holidays.length > 0 && (
                    <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 shadow-md">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Holiday
                    </Button>
                  )}
                </div>
                {holidays.length > 0 && (
                  <div className="mt-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search holidays by name or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white dark:bg-gray-900"
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex items-center justify-center p-12">
                    <div className="text-center space-y-3">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-muted-foreground">Loading holidays...</p>
                    </div>
                  </div>
                ) : holidays.length === 0 ? (
                  <div className="text-center p-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-full flex items-center justify-center shadow-lg">
                      <PartyPopper className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">No holidays added yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Start by adding company-wide or regional holidays to help employees plan their time off
                    </p>
                    <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 shadow-md">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Holiday
                    </Button>
                  </div>
                ) : filteredHolidays.length === 0 ? (
                  <div className="text-center p-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                      <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No holidays found</h3>
                    <p className="text-muted-foreground mb-4">
                      No holidays match your search query "{searchQuery}"
                    </p>
                    <Button variant="outline" onClick={() => setSearchQuery('')}>
                      Clear Search
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/50 overflow-hidden bg-white dark:bg-gray-900">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-800">
                          <TableHead className="font-semibold">Holiday Name</TableHead>
                          <TableHead className="font-semibold">Date</TableHead>
                          <TableHead className="font-semibold">Description</TableHead>
                          <TableHead className="font-semibold">Recurring</TableHead>
                          <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHolidays.map((holiday) => (
                          <TableRow key={holiday.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors">
                            <TableCell className="font-medium">{holiday.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span>{formatDate(holiday.date)}</span>
                              </div>
                            </TableCell>
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
                              <Badge
                                variant={holiday.isRecurring ? 'default' : 'secondary'}
                                className={holiday.isRecurring ? 'bg-blue-600 hover:bg-blue-700' : ''}
                              >
                                {holiday.isRecurring ? 'Yes' : 'No'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(holiday)}
                                  className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/50 transition-all duration-200"
                                  title="Edit holiday"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingHoliday(holiday)}
                                  className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-950/50 transition-all duration-200"
                                  title="Delete holiday"
                                >
                                  <Trash2 className="h-4 w-4" />
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
              {filteredHolidays.length > 0 && (
                <CardFooter className="border-t border-border/50 pt-4 text-sm text-muted-foreground">
                  Showing {filteredHolidays.length} of {holidays.length} {holidays.length === 1 ? 'holiday' : 'holidays'}
                </CardFooter>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

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
                  <TailwindDatePicker
                    date={formData.date}
                    onSelect={(date) => setFormData({ ...formData, date })}
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
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingHoliday ? 'Update Holiday' : 'Save Holiday'}
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