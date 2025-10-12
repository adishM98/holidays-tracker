import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, FileText, Home, Users, LogOut, Clock, Menu, X, Settings, Upload, UserCircle, ChevronLeft, ChevronRight, LayoutDashboard, CalendarCheck, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useTheme } from '@/contexts/ThemeContext';
import { adminAPI } from '@/services/api';

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

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { actualTheme } = useTheme();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load collapse state from localStorage
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

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
      title: 'MAIN',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }
      ]
    },
    {
      title: 'LEAVE MANAGEMENT',
      items: [
        { path: '/apply-leave', icon: Calendar, label: 'Apply Leave' },
        { path: '/pending-approvals', icon: Clock, label: 'Pending Approvals', badge: pendingCount },
        { path: '/leave-history', icon: FileText, label: 'Leave History' }
      ]
    }
  ];

  const adminNavSections: NavSection[] = [
    {
      title: 'MAIN',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/admin/employees', icon: Users, label: 'People' }
      ]
    },
    {
      title: 'LEAVE MANAGEMENT',
      items: [
        { path: '/admin/calendar', icon: CalendarCheck, label: 'Mark Leave/Attendance' }
      ]
    },
    {
      title: 'REPORTS & SETTINGS',
      items: [
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

  useEffect(() => {
    // Save collapse state to localStorage
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

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

  const renderNavItem = (item: NavItem, isCollapsed: boolean) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    const showBadge = item.badge && item.badge > 0;

    const navContent = (
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-blue-600 text-white shadow-md border-l-4 border-blue-700'
          : 'text-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-l-4 hover:border-blue-200 dark:hover:border-blue-800'
      }`}>
        <Icon size={20} className="flex-shrink-0" />
        {!isCollapsed && (
          <>
            <span className="font-medium flex-1">{item.label}</span>
            {showBadge && (
              <Badge className="bg-red-500 text-white hover:bg-red-600 h-5 min-w-[20px] px-1.5 flex items-center justify-center text-xs font-semibold">
                {item.badge}
              </Badge>
            )}
          </>
        )}
        {isCollapsed && showBadge && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></div>
        )}
      </div>
    );

    if (isCollapsed) {
      return (
        <TooltipProvider key={item.path}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link to={item.path} className="block relative">
                {navContent}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="flex items-center space-x-2">
              <span>{item.label}</span>
              {showBadge && (
                <Badge className="bg-red-500 text-white">
                  {item.badge}
                </Badge>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Link key={item.path} to={item.path}>
        {navContent}
      </Link>
    );
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
            {logoUrl && (
              <div className="flex items-center justify-center mb-2">
                <img
                  src={`${BACKEND_URL}${logoUrl.split('?')[0]}`}
                  alt="Company Logo"
                  className="h-8 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
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

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navSections.map((section, sectionIdx) => (
              <div key={sectionIdx} className="mb-4">
                {section.title && (
                  <h3 className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    const showBadge = item.badge && item.badge > 0;

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md border-l-4 border-blue-700'
                            : 'text-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon size={20} />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        {showBadge && (
                          <Badge className="bg-red-500 text-white hover:bg-red-600">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
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
    <div
      className={`h-screen bg-card border-r border-border flex flex-col shadow-lg transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header with Logo */}
      <div className={`border-b border-border transition-all duration-300 ${isCollapsed ? 'p-4' : 'p-6'}`}>
        {logoUrl && !isCollapsed && (
          <div className="flex items-center justify-center mb-2">
            <img
              src={`${BACKEND_URL}${logoUrl.split('?')[0]}`}
              alt="Company Logo"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        {!isCollapsed && (
          <p className="text-sm font-bold text-muted-foreground text-center mt-2">
            Leave & Attendance Tracker
          </p>
        )}
        {isCollapsed && logoUrl && (
          <div className="flex items-center justify-center">
            <img
              src={`${BACKEND_URL}${logoUrl.split('?')[0]}`}
              alt="Logo"
              className="h-8 w-8 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* User Profile Section */}
      <div className={`border-b border-border transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {isCollapsed ? (
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to="/profile"
                  className="flex items-center justify-center hover:bg-secondary rounded-lg p-2 transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {getUserInitials()}
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div>
                  <p className="font-medium">{getUserDisplayName()}</p>
                  <p className="text-xs text-muted-foreground">{getUserPosition()}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="flex items-center justify-between">
            <Link
              to="/profile"
              className="flex items-center space-x-3 flex-1 hover:bg-secondary rounded-lg p-2 transition-colors"
              title="View Profile"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {getUserInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{getUserDisplayName()}</p>
                <p className="text-sm text-muted-foreground truncate">{getUserPosition()}</p>
              </div>
            </Link>
            <ThemeToggle />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <div className="space-y-1">
          {navSections.map((section, sectionIdx) => (
            <div key={sectionIdx} className={isCollapsed ? 'mb-2' : 'mb-4'}>
              {section.title && !isCollapsed && (
                <h3 className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </h3>
              )}
              {section.title && isCollapsed && (
                <div className="h-px bg-border my-2 mx-2"></div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => renderNavItem(item, isCollapsed))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer with Collapse Button and Logout */}
      <div className={`border-t border-border transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {/* Collapse Toggle Button */}
        <div className={`${isCollapsed ? 'mb-2' : 'mb-3'}`}>
          <Button
            onClick={toggleCollapse}
            variant="ghost"
            size={isCollapsed ? "sm" : "default"}
            className={`${isCollapsed ? 'w-full p-2' : 'w-full'} flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} text-muted-foreground hover:text-foreground hover:bg-secondary`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {!isCollapsed && <span className="text-sm">Collapse</span>}
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </Button>
        </div>

        {/* Logout Button */}
        {isCollapsed ? (
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="w-full p-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500"
                >
                  <LogOut size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span>Logout</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button
            onClick={logout}
            variant="outline"
            className="w-full flex items-center justify-center space-x-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;