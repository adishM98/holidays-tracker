import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users data
const mockUsers: Record<string, User> = {
  'john.doe': {
    id: '1',
    username: 'john.doe',
    name: 'John Doe',
    role: 'employee',
    department: 'Engineering',
    leaveBalance: {
      paid: 15,
      sick: 10,
      casual: 12
    }
  },
  'sarah.manager': {
    id: '2',
    username: 'sarah.manager',
    name: 'Sarah Johnson',
    role: 'manager',
    department: 'HR',
    leaveBalance: {
      paid: 20,
      sick: 15,
      casual: 10
    }
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('leaveApp_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, password: string, role: UserRole): Promise<boolean> => {
    // Mock authentication - in real app this would be an API call
    const mockUser = mockUsers[username];
    
    if (mockUser && mockUser.role === role && password === 'password') {
      setUser(mockUser);
      localStorage.setItem('leaveApp_user', JSON.stringify(mockUser));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('leaveApp_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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