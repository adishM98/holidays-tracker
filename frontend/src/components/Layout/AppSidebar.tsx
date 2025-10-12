import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, FileText, Home, Users, LogOut, Clock, Settings, UserCircle, LayoutDashboard, CalendarCheck, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useTheme } from '@/contexts/ThemeContext';
import { adminAPI } from '@/services/api';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`;
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || window.location.origin;

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface NavItem {
  path: string;
  icon: any;
  label: string;
  badge?: number;
}

export function AppSidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { actualTheme } = useTheme();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

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

  useEffect(() => {
    // Fetch pending approvals count for admin/manager
    const fetchPendingCount = async () => {
      try {
        if (user?.role === 'admin' || user?.role === 'manager') {
          const response = await adminAPI.getAllLeaveRequests();
          const pending = response.requests?.filter((r: any) => r.status === 'pending').length || 0;
          setPendingCount(pending);
        }
      } catch (error) {
        console.error('Error fetching pending count:', error);
      }
    };

    fetchPendingCount();
    // Refresh pending count every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [user?.role]);

  const employeeNavSections: NavSection[] = [
    {
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/apply-leave', icon: Calendar, label: 'Apply Leave' },
        { path: '/leave-history', icon: FileText, label: 'Leave History' }
      ]
    }
  ];

  const managerNavSections: NavSection[] = [
    {
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/apply-leave', icon: Calendar, label: 'Apply Leave' },
        { path: '/pending-approvals', icon: Clock, label: 'Pending Approvals', badge: pendingCount },
        { path: '/leave-history', icon: FileText, label: 'Leave History' }
      ]
    }
  ];

  const adminNavSections: NavSection[] = [
    {
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/admin/employees', icon: Users, label: 'People' },
        { path: '/admin/calendar', icon: CalendarCheck, label: 'Mark Leave/Attendance' },
        { path: '/admin/reports', icon: BarChart3, label: 'Reports' },
        { path: '/admin/settings', icon: Settings, label: 'Settings' }
      ]
    }
  ];

  const getNavSections = (): NavSection[] => {
    switch (user?.role) {
      case 'admin':
        return adminNavSections;
      case 'manager':
        return managerNavSections;
      default:
        return employeeNavSections;
    }
  };

  const navSections = getNavSections();
  
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
              <span className="text-xs text-sidebar-foreground/60"></span>
            </div>
          )}
          <ThemeToggle />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navSections.map((section, sectionIdx) => (
          <SidebarGroup key={sectionIdx} className="border-none px-0">
            {section.title && (
              <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider px-4">
                {section.title}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  const showBadge = item.badge && item.badge > 0;

                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={isActive ? "bg-blue-600 text-white hover:bg-blue-700 data-[active=true]:bg-blue-600 data-[active=true]:text-white border-l-4 border-blue-700" : "hover:border-l-4 hover:border-blue-200 dark:hover:border-blue-800"}
                      >
                        <Link to={item.path} className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-2">
                            <Icon size={20} />
                            <span>{item.label}</span>
                          </div>
                          {showBadge && (
                            <Badge className="bg-red-500 text-white hover:bg-red-600 h-5 min-w-[20px] px-1.5 flex items-center justify-center text-xs font-semibold ml-auto">
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="p-4 space-y-3 border-t border-sidebar-border">
          <Link
            to="/profile"
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
              {getUserInitials()}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium text-sidebar-foreground truncate group-hover:text-blue-600">
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
            className="w-full flex items-center justify-center space-x-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500 transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}