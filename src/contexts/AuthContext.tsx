import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, AuthContextType } from '@/types';
import { authAPI, employeeAPI, getAuthToken, removeAuthToken } from '@/services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const lastRoleCheckRef = useRef<number>(0);

  // Initialize auth on mount
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
        
        // Try to refresh user data from API immediately on initialization
        try {
          if (userData.role !== 'admin') {
            const profileData = await employeeAPI.getProfile();
            
            // Check if role has changed since last login
            const currentRole = profileData.user.role;
            if (currentRole !== userData.role) {
              console.log(`🔄 Role changed during initialization: ${userData.role} → ${currentRole}`);
              
              // Update user data with current role
              const updatedUser = {
                ...userData,
                role: currentRole as any,
                employee: profileData.employee,
                mustChangePassword: profileData.user.mustChangePassword,
              };
              
              setUser(updatedUser);
              localStorage.setItem('user_data', JSON.stringify(updatedUser));
            } else {
              // No role change, just update profile data
              const updatedUser = {
                ...userData,
                employee: profileData.employee,
                mustChangePassword: profileData.user.mustChangePassword,
              };
              setUser(updatedUser);
              localStorage.setItem('user_data', JSON.stringify(updatedUser));
            }
          } else {
            // Admin user, just set the stored data
            setUser(userData);
          }
        } catch (error) {
          console.warn('Failed to refresh user data during initialization:', error);
          // If refresh fails, keep stored user data but remove token if it's invalid
          setUser(userData);
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
        mustChangePassword: response.user.mustChangePassword,
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

  // Update userRef whenever user changes
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refreshUser = useCallback(async (force = false) => {
    try {
      const currentUser = userRef.current;
      if (!currentUser) return;
      
      const now = Date.now();
      // Rate limit to avoid excessive API calls (minimum 5 seconds between calls unless forced)
      if (!force && (now - lastRoleCheckRef.current) < 5000) {
        return;
      }
      lastRoleCheckRef.current = now;
      
      // Get updated profile data including current role
      if (currentUser.role !== 'admin') {
        const profileData = await employeeAPI.getProfile();
        
        // Check if role has changed
        const currentRole = profileData.user.role;
        const hasRoleChanged = currentRole !== currentUser.role;
        
        // Only update if there are actual changes to avoid infinite loops
        if (hasRoleChanged || 
            JSON.stringify(profileData.employee) !== JSON.stringify(currentUser.employee) ||
            profileData.user.mustChangePassword !== currentUser.mustChangePassword) {
          
          const updatedUser = {
            ...currentUser,
            role: currentRole as any, // Update role from backend
            employee: profileData.employee,
            mustChangePassword: profileData.user.mustChangePassword,
          };
          
          setUser(updatedUser);
          localStorage.setItem('user_data', JSON.stringify(updatedUser));
          
          // Log role change for debugging
          if (hasRoleChanged) {
            console.log(`🔄 Role updated: ${currentUser.role} → ${currentRole}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      // Don't throw error to prevent cascading failures
    }
  }, []);

  const updateUser = (userData: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('user_data', JSON.stringify(updatedUser));
  };

  const setUserData = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user_data', JSON.stringify(userData));
  };

  const checkRoleChange = useCallback(async () => {
    await refreshUser(true); // Force refresh for explicit role check
  }, [refreshUser]);

  const forceRoleSync = useCallback(async () => {
    console.log('🔄 Force role sync triggered');
    await refreshUser(true); // Force refresh for explicit sync
  }, [refreshUser]);

  // Set up less aggressive periodic role checking when user is logged in
  useEffect(() => {
    if (!user?.id) return;

    // Check for role changes every 30 seconds instead of 2 seconds
    const roleCheckInterval = setInterval(async () => {
      await refreshUser(); // Use rate-limited refresh
    }, 30000); // 30 seconds

    return () => clearInterval(roleCheckInterval);
  }, [user?.id, refreshUser]); // Include refreshUser in deps but it's stable

  // Set up role checking on page visibility/focus events (less aggressive)
  useEffect(() => {
    if (!user?.id) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible - check for role changes with rate limiting
        refreshUser();
      }
    };

    const handleFocus = () => {
      // Window focused - check for role changes with rate limiting
      refreshUser();
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      // Cleanup event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id, refreshUser]); // Include refreshUser but it's stable

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser, updateUser, setUser: setUserData, checkRoleChange }}>
      {children}
    </AuthContext.Provider>
  );
};

// Export useAuth hook with proper component signature for HMR compatibility
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}