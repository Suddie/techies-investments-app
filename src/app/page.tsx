"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthProvider';
import { APP_NAME } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';


export default function HomePage() {
  const { user, loading, userProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (userProfile?.requiresPasswordChange) {
          router.replace('/change-password');
        } else {
          router.replace('/dashboard');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, userProfile, loading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="flex items-center space-x-2 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
        <h1 className="text-2xl font-semibold text-foreground">{APP_NAME}</h1>
      </div>
      <Skeleton className="w-64 h-8 mb-4" />
      <Skeleton className="w-48 h-6" />
      <p className="mt-4 text-muted-foreground">Loading application...</p>
    </div>
  );
}
