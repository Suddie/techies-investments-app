"use client";

import { useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { APP_NAME } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredAccessLevel?: number;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredAccessLevel, adminOnly }) => {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() A => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (userProfile?.requiresPasswordChange && window.location.pathname !== '/change-password') {
         router.push('/change-password');
      } else {
        let authorized = true;
        if (adminOnly && userProfile?.role !== 'Admin') {
          authorized = false;
        }
        if (requiredAccessLevel && userProfile && userProfile.accessLevel > requiredAccessLevel) {
          authorized = false;
        }

        if (!authorized) {
          // console.warn("User not authorized for this route. Redirecting to dashboard.");
          router.push('/dashboard'); 
        }
      }
    }
  }, [user, userProfile, loading, router, requiredAccessLevel, adminOnly]);

  if (loading || !user || (userProfile?.requiresPasswordChange && window.location.pathname !== '/change-password') ) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="flex items-center space-x-2 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          <h1 className="text-2xl font-semibold text-foreground">{APP_NAME}</h1>
        </div>
        <Skeleton className="w-64 h-8 mb-4" />
        <Skeleton className="w-48 h-6" />
      </div>
    );
  }
  
  // Authorization check for admin/access level
  if (adminOnly && userProfile?.role !== 'Admin') {
    // This should ideally be caught by useEffect redirect, but as a fallback:
    return <div className="p-4">Access Denied. Admin rights required.</div>;
  }
  if (requiredAccessLevel && userProfile && userProfile.accessLevel > requiredAccessLevel) {
     // This should ideally be caught by useEffect redirect, but as a fallback:
    return <div className="p-4">Access Denied. Insufficient access level.</div>;
  }


  return <>{children}</>;
};

export default ProtectedRoute;
