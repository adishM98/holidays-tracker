import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthContextType } from '@/types';
import { authAPI, employeeAPI, getAuthToken, removeAuthToken } from '@/services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const token = getAuthToken();
      const storedUser = localStorage.getItem('user_data');
      
      if (token && storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        
        // Try to refresh user data from API
        try {
          await refreshUser();
        } catch (error) {
          console.warn('Failed to refresh user data:', error);
          // If refresh fails, keep stored user data but remove token
          removeAuthToken();
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      // Clear any corrupted data
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(email, password);
      
      // Store refresh token
      if (response.refresh_token) {
        localStorage.setItem('refresh_token', response.refresh_token);
      }
      
      // Create user object from login response
      const userData: User = {
        id: response.user.id,
        email: response.user.email,
        role: response.user.role as any,
      };
      
      // Get employee profile data if user is not admin
      if (response.user.role !== 'admin') {
        try {
          const profileData = await employeeAPI.getProfile();
          userData.employee = profileData.employee;
        } catch (error) {
          console.warn('Failed to load employee profile:', error);
        }
      }
      
      setUser(userData);
      localStorage.setItem('user_data', JSON.stringify(userData));
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('user_data');
      localStorage.removeItem('refresh_token');
    }
  };

  const refreshUser = async () => {
    try {
      if (!user) return;
      
      // Get updated profile data
      if (user.role !== 'admin') {
        const profileData = await employeeAPI.getProfile();
        const updatedUser = {
          ...user,
          employee: profileData.employee,
        };
        setUser(updatedUser);
        localStorage.setItem('user_data', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};