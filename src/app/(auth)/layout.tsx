import { APP_NAME } from '@/lib/constants';
import { useSettings } from '@/contexts/SettingsProvider'; // Cannot use hooks in server components
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const { settings } = useSettings(); // This won't work here as it's a server component.
  // Settings will be fetched client-side in login form or globally.
  // For layout, we can use constants or pass props if dynamic.
  // For now, using a generic logo.

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          {/* Placeholder for logo, actual logo from settings will be on client side components like LoginForm */}
           <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mb-4"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          <h1 className="text-3xl font-bold text-foreground">{APP_NAME}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
