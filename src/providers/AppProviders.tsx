"use client";

import type React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FirebaseProvider } from '@/contexts/FirebaseProvider';
import { AuthProvider } from '@/contexts/AuthProvider';
import { SettingsProvider } from '@/contexts/SettingsProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from "@/components/ui/toaster";


interface AppProvidersProps {
  children: React.ReactNode;
}

const queryClient = new QueryClient();

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <FirebaseProvider>
          <AuthProvider>
            <SettingsProvider>
              {children}
              <Toaster />
            </SettingsProvider>
          </AuthProvider>
        </FirebaseProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};
