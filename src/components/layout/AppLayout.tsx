import type React from 'react';
import Header from './Header';
import SidebarNavigation from './SidebarNavigation';
import ProtectedRoute from '@/components/common/ProtectedRoute';

interface AppLayoutProps {
  children: React.ReactNode;
  requiredAccessLevel?: number;
  adminOnly?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, requiredAccessLevel, adminOnly }) => {
  return (
    <ProtectedRoute requiredAccessLevel={requiredAccessLevel} adminOnly={adminOnly}>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-muted/40 md:block">
          <SidebarNavigation />
        </div>
        <div className="flex flex-col">
          <Header />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AppLayout;
