import React from 'react';
import Sidebar from './Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className={`flex-1 overflow-auto ${isMobile ? '' : ''}`}>
        <div className={`${isMobile ? 'p-4 pt-20' : 'p-8'}`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;