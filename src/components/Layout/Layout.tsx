import React from 'react';
import Sidebar from './Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-secondary/30 to-accent-light">
      <Sidebar />
      <main className={`flex-1 overflow-auto ${isMobile ? '' : ''}`}>
        <div className={`${isMobile ? 'p-6 pt-20' : 'p-8'} min-h-full`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;