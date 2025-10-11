import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import Login from '@/pages/Login';
import Profile from '@/pages/Profile';
import Layout from '@/components/Layout/Layout';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // If user must change password and is not already on profile page, redirect to profile
  if (user.mustChangePassword && location.pathname !== '/profile') {
    return (
      <Layout>
        <Profile />
      </Layout>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;