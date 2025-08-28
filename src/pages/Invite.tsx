import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/services/api';

const Invite: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [employeeInfo, setEmployeeInfo] = useState<any>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Parse URL parameters
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');

    console.log('Invite URL params:', { token, email }); // Debug log

    if (token && email) {
      // Decode and validate token
      try {
        // Convert URL-safe base64 back to standard base64
        const standardBase64 = token.replace(/-/g, '+').replace(/_/g, '/');
        // Add padding if needed
        const paddedBase64 = standardBase64 + '='.repeat((4 - standardBase64.length % 4) % 4);
        
        console.log('Original token:', token); // Debug log
        console.log('Standard base64:', paddedBase64); // Debug log
        
        const decodedToken = atob(paddedBase64);
        console.log('Decoded token:', decodedToken); // Debug log
        const [employeeId, tokenEmail, timestamp] = decodedToken.split('|');
        
        console.log('Token parts:', { employeeId, tokenEmail, timestamp, email }); // Debug log
        
        // Basic validation - decode the email from URL encoding
        const decodedEmail = decodeURIComponent(email);
        if (tokenEmail === decodedEmail) {
          setValidToken(true);
          setFormData(prev => ({ ...prev, email: decodedEmail }));
          
          // In a real implementation, you'd validate the token with the backend
          // For now, we'll simulate employee info
          setEmployeeInfo({
            id: employeeId,
            email: decodedEmail,
            timestamp: parseInt(timestamp)
          });
          
          console.log('Token validation successful'); // Debug log
        } else {
          console.error('Email mismatch:', { tokenEmail, decodedEmail }); // Debug log
          throw new Error('Invalid token - email mismatch');
        }
      } catch (error) {
        console.error('Invalid invite token:', error);
        console.error('Error details:', { error: error.message, token: token?.substring(0, 20) + '...' });
        // Don't show toast immediately, let the user see the page
        setValidToken(false);
      }
    } else {
      console.error('Missing parameters:', { token: !!token, email: !!email }); // Debug log
      setValidToken(false);
    }
  }, [location]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const urlParams = new URLSearchParams(location.search);
      const token = urlParams.get('token');
      
      if (!token) {
        throw new Error('Missing invite token');
      }

      // Call the backend API to complete the invite
      const response = await fetch('http://localhost:3000/api/auth/complete-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          token: token,
          password: formData.password
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create account');
      }
      
      toast({
        title: "Account Created Successfully!",
        description: "Your password has been set. Redirecting to login page...",
      });
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (error) {
      console.error('Error creating account:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
      toast({
        title: "Error",
        description: errorMessage + ". Please try again or contact your administrator.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!validToken) {
    const urlParams = new URLSearchParams(location.search);
    const hasToken = !!urlParams.get('token');
    const hasEmail = !!urlParams.get('email');
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <div className="text-red-600 text-2xl">⚠️</div>
            </div>
            <CardTitle className="text-red-600">Invalid Invite Link</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {!hasToken && !hasEmail 
                ? "The invite link appears to be incomplete or corrupted."
                : "This invite link is invalid or has expired."
              }
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
              <Button onClick={() => navigate('/login')} variant="outline" className="flex-1">
                Go to Login
              </Button>
              <Button onClick={() => window.location.reload()} variant="default" className="flex-1">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-600 rounded-full flex items-center justify-center">
            <img 
              src="/tooljet-light.svg"
              alt="ToolJet Logo" 
              className="h-8 w-8 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to ToolJet</CardTitle>
          <p className="text-muted-foreground">Complete your account setup</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This email was provided by your administrator
              </p>
            </div>

            <div>
              <Label htmlFor="password">Create Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                placeholder="Enter a secure password"
                minLength={6}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                required
                placeholder="Confirm your password"
                minLength={6}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:text-blue-500"
              >
                Sign in here
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invite;