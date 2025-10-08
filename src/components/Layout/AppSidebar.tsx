import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, FileText, Home, Users, LogOut, Clock, Settings, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useTheme } from '@/contexts/ThemeContext';
import { adminAPI } from '@/services/api';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`;
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || window.location.origin;

export function AppSidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { actualTheme } = useTheme();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Fetch custom logo
    const fetchLogo = async () => {
      try {
        const response = await adminAPI.getLogoUrl();
        if (response.url) {
          setLogoUrl(response.url);
        }
      } catch (error) {
        console.error('Error fetching logo:', error);
      }
    };
    fetchLogo();
  }, []);

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

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between p-4">
          {logoUrl ? (
            <img
              src={`${BACKEND_URL}${logoUrl.split('?')[0]}`}
              alt="Company Logo"
              className="h-6 w-auto object-contain max-w-[120px]"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="flex flex-col">
              <span className="text-xs text-sidebar-foreground/60">Leave & Attendance Tracker</span>
            </div>
          )}
          <ThemeToggle />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive} className={isActive ? "bg-blue-600 text-white hover:bg-blue-700 data-[active=true]:bg-blue-600 data-[active=true]:text-white" : ""}>
                      <Link to={item.path}>
                        <Icon size={20} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-4 space-y-3">
          <Link 
            to="/profile" 
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
              {getUserInitials()}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium text-sidebar-foreground truncate">
                {getUserDisplayName()}
              </span>
              <span className="text-xs text-sidebar-foreground/60 truncate">
                {getUserPosition()}
              </span>
            </div>
          </Link>
          <Button
            onClick={logout}
            variant="outline"
            size="sm"
            className="w-full flex items-center space-x-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}