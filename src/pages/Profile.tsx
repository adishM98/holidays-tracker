import React, { useState, useEffect } from 'react';
import { User, Lock, Phone, Mail, Calendar, MapPin, Briefcase, Shield, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { employeeAPI, authAPI } from '@/services/api';

interface EmployeeProfile {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  position: string;
  department: {
    id: string;
    name: string;
  };
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  joiningDate: string;
  user: {
    id: string;
    email: string;
    role: string;
    mustChangePassword: boolean;
  };
}

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      // For admin users who might not have employee profile
      if (user?.role === 'admin') {
        // Create a minimal profile from user data
        const adminProfile = {
          id: user.id,
          employeeId: 'ADMIN001',
          firstName: user.email?.split('@')[0] || 'System',
          lastName: 'Administrator',
          position: 'System Administrator',
          department: { id: 'admin', name: 'Administration' },
          joiningDate: '2024-01-01',
          user: {
            id: user.id,
            email: user.email || '',
            role: user.role,
            mustChangePassword: user.mustChangePassword || false
          }
        };
        setProfile(adminProfile as EmployeeProfile);
      } else {
        const response = await employeeAPI.getProfile();
        setProfile(response.employee);
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to fetch profile information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation password do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(passwordForm.newPassword)) {
      toast({
        title: "Password Too Weak",
        description: "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character (@$!%*?&)",
        variant: "destructive",
      });
      return;
    }

    try {
      setChangingPassword(true);
      
      // Direct password reset for all users - no current password needed
      await authAPI.changePassword({
        currentPassword: '', // Empty for all users - direct reset
        newPassword: passwordForm.newPassword,
      });

      // Update user context if this was a mandatory password change
      if (user?.mustChangePassword) {
        updateUser({ ...user, mustChangePassword: false });
      }

      setPasswordForm({ newPassword: '', confirmPassword: '' });
      setIsPasswordDialogOpen(false);

      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully",
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-secondary rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64 bg-secondary rounded"></div>
              <div className="h-64 bg-secondary rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Profile Not Found</h1>
          <p className="text-muted-foreground">Unable to load your profile information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-xl">
              {profile.firstName[0]}{profile.lastName[0]}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="text-lg text-muted-foreground">{profile.position}</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Lock className="h-4 w-4" />
                  <span>Change Password</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Must contain at least 8 characters with uppercase, lowercase, number and special character (@$!%*?&)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsPasswordDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      className="flex-1"
                    >
                      {changingPassword ? "Changing..." : "Change Password"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {user?.mustChangePassword && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-destructive" />
              <div>
                <h3 className="font-semibold text-destructive">Password Change Required</h3>
                <p className="text-sm text-destructive/80">You must change your password before continuing to use the system.</p>
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setIsPasswordDialogOpen(true)}
              >
                Change Password
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Personal Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">First Name</Label>
                  <p className="mt-1 font-medium">{profile.firstName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Last Name</Label>
                  <p className="mt-1 font-medium">{profile.lastName}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email Address</Label>
                <div className="mt-1 flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{profile.user.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5" />
                <span>Employment Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Employee ID</Label>
                <p className="mt-1 font-medium">{profile.employeeId}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Position</Label>
                <p className="mt-1 font-medium">{profile.position}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Department</Label>
                <div className="mt-1 flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{profile.department.name}</span>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Joining Date</Label>
                <div className="mt-1 flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{new Date(profile.joiningDate).toLocaleDateString()}</span>
                </div>
              </div>
              
              {profile.manager && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Manager</Label>
                  <p className="mt-1 font-medium">{profile.manager.firstName} {profile.manager.lastName}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;