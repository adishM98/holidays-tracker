import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, FileText, Home, Users, LogOut, Clock, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
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
    { path: '/team-requests', icon: Users, label: 'Team Requests' },
    { path: '/leave-history', icon: FileText, label: 'Leave History' }
  ];

  const navItems = user?.role === 'manager' ? managerNavItems : employeeNavItems;

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
            <h1 className="text-xl font-bold text-primary">LeaveManager</h1>
            <p className="text-sm text-muted-foreground mt-1">Professional Leave Management</p>
          </div>

          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white font-semibold">
                {user?.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="font-medium text-foreground">{user?.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{user?.role} • {user?.department}</p>
              </div>
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
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-smooth hover:bg-secondary ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-professional-sm' 
                      : 'text-foreground hover:text-primary'
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
              className="w-full flex items-center space-x-2"
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
        <h1 className="text-xl font-bold text-primary">LeaveManager</h1>
        <p className="text-sm text-muted-foreground mt-1">Professional Leave Management</p>
      </div>

      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white font-semibold">
            {user?.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <p className="font-medium text-foreground">{user?.name}</p>
            <p className="text-sm text-muted-foreground capitalize">{user?.role} • {user?.department}</p>
          </div>
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
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-smooth hover:bg-secondary ${
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-professional-sm' 
                  : 'text-foreground hover:text-primary'
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
          className="w-full flex items-center space-x-2"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;