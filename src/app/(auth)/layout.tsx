import type React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="w-full max-w-md">
        {/* The app name and logo are now handled by the LoginForm itself or global settings */}
        {children}
      </div>
    </div>
  );
}
