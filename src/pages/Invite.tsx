import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`;
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || window.location.origin;

const Invite: React.FC = () => {
  const { actualTheme } = useTheme();
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [employeeInfo, setEmployeeInfo] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Fetch custom logo
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await adminAPI.getLogoUrl();
        if (response?.url) setLogoUrl(response.url);
      } catch (error) {
        console.error('Error fetching logo:', error);
      }
    };
    fetchLogo();
  }, []);

  useEffect(() => {
    // Parse URL parameters
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');

    if (token && email) {
      try {
        const standardBase64 = token.replace(/-/g, '+').replace(/_/g, '/');
        const paddedBase64 = standardBase64 + '='.repeat((4 - standardBase64.length % 4) % 4);
        const decodedToken = atob(paddedBase64);
        const [employeeId, tokenEmail, timestamp] = decodedToken.split('|');
        const decodedEmail = decodeURIComponent(email);

        if (tokenEmail === decodedEmail) {
          const tokenAge = Date.now() - parseInt(timestamp);
          const twentyFourHours = 24 * 60 * 60 * 1000;

          if (tokenAge > twentyFourHours) {
            throw new Error('Invite link has expired');
          }

          setValidToken(true);
          setFormData(prev => ({ ...prev, email: decodedEmail }));

          setEmployeeInfo({ id: employeeId, email: decodedEmail, timestamp: parseInt(timestamp), isExpired: false });
        } else {
          throw new Error('Invalid token - email mismatch');
        }
      } catch (error) {
        console.error('Invalid invite token:', error);
        setValidToken(false);
      }
    } else {
      setValidToken(false);
    }
  }, [location]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Password Mismatch', description: 'Passwords do not match. Please try again.', variant: 'destructive' });
      return;
    }

    if (formData.password.length < 6) {
      toast({ title: 'Password Too Short', description: 'Password must be at least 6 characters long.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const urlParams = new URLSearchParams(location.search);
      const token = urlParams.get('token');

      if (!token) throw new Error('Missing invite token');

      const response = await fetch(`${API_BASE_URL}/auth/complete-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, token, password: formData.password }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.message || 'Failed to create account');

      toast({ title: 'Account Created Successfully!', description: 'Your password has been set. Redirecting to login page...' });

      setTimeout(() => navigate('/login'), 1600);
    } catch (error) {
      console.error('Error creating account:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
      toast({ title: 'Error', description: `${errorMessage}. Please try again or contact your administrator.`, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!validToken) {
    const urlParams = new URLSearchParams(location.search);
    const hasToken = !!urlParams.get('token');
    const hasEmail = !!urlParams.get('email');

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <ShieldAlert className="text-red-600" />
            </div>
            <CardTitle className="text-red-600">Invalid Invite Link</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {!hasToken && !hasEmail ? 'The invite link appears to be incomplete or corrupted.' : 'This invite link is invalid or has expired.'}
            </p>

            <div className="bg-muted/50 p-4 rounded-lg text-left">
              <h4 className="font-medium mb-2">Troubleshooting:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Make sure you copied the complete URL</li>
                <li>• Check if the link has expired</li>
                <li>• Contact your administrator for a new invite</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => navigate('/login')} variant="outline" className="flex-1">Go to Login</Button>
              <Button onClick={() => window.location.reload()} variant="default" className="flex-1">Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Illustration - restored and improved placement */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-indigo-50/30 dark:from-blue-900/10 dark:via-transparent dark:to-indigo-900/10"></div>

        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-40 dark:opacity-30 hidden lg:block">
          {/* Calendar Grid Illustration (kept from original) */}
          <div className="relative w-80 h-64">
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
              <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="w-16 h-4 bg-gray-300/60 dark:bg-gray-600/60 rounded"></div>
                  <div className="flex space-x-2">
                    <div className="w-6 h-6 border border-gray-300/60 dark:border-gray-600/60 rounded"></div>
                    <div className="w-6 h-6 border border-gray-300/60 dark:border-gray-600/60 rounded"></div>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="w-8 h-6 bg-gray-200/40 dark:bg-gray-700/40 rounded-sm"></div>
                  ))}

                  {Array.from({ length: 21 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-6 rounded-sm ${
                        i === 10 || i === 15
                          ? 'bg-blue-500/60'
                          : i === 5 || i === 18
                          ? 'bg-green-500/40'
                          : 'bg-gray-100/60 dark:bg-gray-700/40'
                      }`}
                    ></div>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute -right-16 top-4 w-24 h-16 bg-white/90 dark:bg-gray-800/90 rounded-lg border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
              <div className="p-3">
                <div className="w-4 h-2 bg-blue-500/60 rounded mb-2"></div>
                <div className="w-12 h-2 bg-gray-300/60 dark:bg-gray-600/60 rounded"></div>
              </div>
            </div>

            <div className="absolute -right-8 bottom-8 w-20 h-14 bg-white/90 dark:bg-gray-800/90 rounded-lg border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
              <div className="p-2">
                <div className="w-3 h-3 bg-green-500/60 rounded-full mb-1"></div>
                <div className="w-10 h-1.5 bg-gray-300/60 dark:bg-gray-600/60 rounded"></div>
              </div>
            </div>

            <div className="absolute -left-12 top-12 w-16 h-16 bg-white/90 dark:bg-gray-800/90 rounded-full border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm flex items-center justify-center">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 border-2 border-gray-300/60 dark:border-gray-600/60 rounded-full"></div>
                <div className="absolute top-1 left-1/2 w-0.5 h-3 bg-gray-400/80 -translate-x-0.5 origin-bottom rotate-90"></div>
                <div className="absolute top-2 left-1/2 w-0.5 h-2 bg-gray-600/80 -translate-x-0.5 origin-bottom rotate-45"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute left-8 top-1/4 opacity-25 dark:opacity-20 hidden lg:block">
          <div className="space-y-4">
            <div className="w-32 h-2 bg-gray-200/40 dark:bg-gray-700/40 rounded-full">
              <div className="w-20 h-2 bg-blue-500/30 rounded-full"></div>
            </div>
            <div className="w-28 h-2 bg-gray-200/40 dark:bg-gray-700/40 rounded-full">
              <div className="w-16 h-2 bg-green-500/30 rounded-full"></div>
            </div>
            <div className="w-24 h-2 bg-gray-200/40 dark:bg-gray-700/40 rounded-full">
              <div className="w-18 h-2 bg-purple-500/30 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-16 right-16 opacity-30 dark:opacity-25 hidden xl:block">
          <div className="flex space-x-3">
            <div className="w-16 h-20 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm p-3">
              <div className="w-6 h-6 bg-blue-500/40 rounded mb-2"></div>
              <div className="w-8 h-1.5 bg-gray-300/60 dark:bg-gray-600/60 rounded mb-1"></div>
              <div className="w-10 h-1 bg-gray-200/60 dark:bg-gray-700/60 rounded"></div>
            </div>
            <div className="w-16 h-20 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm p-3">
              <div className="w-6 h-6 bg-green-500/40 rounded mb-2"></div>
              <div className="w-8 h-1.5 bg-gray-300/60 dark:bg-gray-600/60 rounded mb-1"></div>
              <div className="w-10 h-1 bg-gray-200/60 dark:bg-gray-700/60 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Centered */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {logoUrl && (
              <div className="flex items-center justify-center mb-4">
                <img
                  src={`${BACKEND_URL}${logoUrl.split('?')[0]}`}
                  alt="Company Logo"
                  className="h-6 w-auto object-contain max-w-[150px]"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="text-center">
              <p className="text-muted-foreground">Complete your account setup to start managing leave requests</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={formData.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground mt-1">This email was provided by your administrator</p>
              </div>

              <div>
                <Label htmlFor="password">Create Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    placeholder="Enter a secure password"
                    minLength={6}
                    className="h-11 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                    placeholder="Confirm your password"
                    minLength={6}
                    className="h-11 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 pr-10"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-md shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2" disabled={loading}>
                <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">Already have an account?{' '}
                <button onClick={() => navigate('/login')} className="text-blue-600 hover:text-blue-500">Sign in here</button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Invite;
