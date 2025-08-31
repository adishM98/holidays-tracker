import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, FileText, Home, Users, LogOut, Clock, Menu, X, Settings, Upload, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useTheme } from '@/contexts/ThemeContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { actualTheme } = useTheme();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const employeeNavItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/apply-leave', icon: Calendar, label: 'Apply Leave' },
    { path: '/leave-history', icon: FileText, label: 'Leave History' }
  ];

  const managerNavItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/apply-leave', icon: Calendar, label: 'Apply Leave' },
    { path: '/pending-approvals', icon: Clock, label: 'Pending Approvals' },
    { path: '/leave-history', icon: FileText, label: 'Leave History' }
  ];

  const adminNavItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/admin/employees', icon: Users, label: 'People' },
    { path: '/admin/calendar', icon: Calendar, label: 'Mark Leave/Attendance' },
    { path: '/admin/reports', icon: FileText, label: 'Reports' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' }
  ];

  const getNavItems = () => {
    switch (user?.role) {
      case 'admin':
        return adminNavItems;
      case 'manager':
        return managerNavItems;
      default:
        return employeeNavItems;
    }
  };

  const navItems = getNavItems();
  
  const getUserDisplayName = () => {
    if (user?.employee?.fullName) {
      return user.employee.fullName;
    }
    if (user?.employee?.firstName && user?.employee?.lastName) {
      return `${user.employee.firstName} ${user.employee.lastName}`;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const getUserInitials = () => {
    const displayName = getUserDisplayName();
    return displayName.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getUserPosition = () => {
    return user?.employee?.position || 'Staff';
  };

  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <div className="fixed top-4 left-4 z-50">
          <Button
            onClick={() => setIsOpen(!isOpen)}
            variant="outline"
            size="sm"
            className="bg-card shadow-professional-md"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>

        {/* Mobile Sidebar Overlay */}
        {isOpen && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
        )}

        {/* Mobile Sidebar */}
        <div className={`fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } shadow-professional-lg flex flex-col`}>
          <div className="p-6 border-b border-border mt-16">
            <div className="flex items-center justify-center">
              <img 
                src={actualTheme === 'dark' ? "/tooljet-dark.svg" : "/tooljet-light.svg"}
                alt="ToolJet Logo" 
                className="h-8 w-auto"
                onError={(e) => {
                  // Fallback to light SVG if dark SVG fails to load
                  e.currentTarget.src = "/tooljet-light.svg";
                }}
              />
            </div>
            <p className="text-sm font-bold text-muted-foreground text-center mt-2">Leave & Attendance Tracker</p>
          </div>

          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <Link 
                to="/profile" 
                className="flex items-center space-x-3 flex-1 hover:bg-secondary rounded-lg p-2 transition-colors"
                title="View Profile"
                onClick={() => setIsOpen(false)}
              >
                <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white font-semibold">
                  {getUserInitials()}
                </div>
                <div>
                  <p className="font-medium text-foreground">{getUserDisplayName()}</p>
                  <p className="text-sm text-muted-foreground">{getUserPosition()}</p>
                </div>
              </Link>
              <ThemeToggle />
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-smooth ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-professional-sm border border-blue-500' 
                      : 'text-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <Button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              variant="outline"
              className="w-full flex items-center space-x-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="h-screen w-64 bg-card border-r border-border flex flex-col shadow-professional-sm">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-center">
          <img 
            src={actualTheme === 'dark' ? "/tooljet-dark.svg" : "/tooljet-light.svg"}
            alt="ToolJet Logo" 
            className="h-8 w-auto"
            onError={(e) => {
              // Fallback to light SVG if dark SVG fails to load
              e.currentTarget.src = "/tooljet-light.svg";
            }}
          />
        </div>
        <p className="text-sm font-bold text-muted-foreground text-center mt-2">Leave & Attendance Tracker</p>
      </div>

      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <Link 
            to="/profile" 
            className="flex items-center space-x-3 flex-1 hover:bg-secondary rounded-lg p-2 transition-colors"
            title="View Profile"
          >
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white font-semibold">
              {getUserInitials()}
            </div>
            <div>
              <p className="font-medium text-foreground">{getUserDisplayName()}</p>
              <p className="text-sm text-muted-foreground">{getUserPosition()}</p>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-smooth ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-professional-sm border border-blue-500' 
                  : 'text-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <Button
          onClick={logout}
          variant="outline"
          className="w-full flex items-center space-x-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;