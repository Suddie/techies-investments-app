
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react"; // Keep a fallback or handle if link.icon is undefined
import { cn } from "@/lib/utils";
import { NAVIGATION_LINKS } from "@/lib/constants"; // APP_NAME removed as it's not used here directly
import { useAuth } from "@/contexts/AuthProvider";
import { useSettings } from "@/contexts/SettingsProvider";
import Image from "next/image";
import type React from 'react'; // Import React for React.ElementType

export default function SidebarNavigation() {
  const pathname = usePathname();
  const { userProfile } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();


  const filteredNavLinks = NAVIGATION_LINKS.filter(link => {
    if (!userProfile) return false;
    if (link.adminOnly && userProfile.role !== 'Admin') return false;
    if (userProfile.accessLevel > link.requiredAccessLevel) return false;
    return true;
  });

  return (
    <div className="flex h-full max-h-screen flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b border-sidebar-border px-4 lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
           {settings.logoUrl ? (
             <Image src={settings.logoUrl} alt={settings.appName} width={32} height={32} data-ai-hint="logo company"/>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          )}
          <span>{settingsLoading ? "Loading..." : settings.appName}</span>
        </Link>
      </div>
      <div className="flex-1 bg-sidebar"> {/* Added bg-sidebar here */}
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 py-4">
          {filteredNavLinks.map((link) => {
            const IconComponent = link.icon as React.ElementType; // Cast to React.ElementType
            return (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href))
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground"
                )}
              >
                {IconComponent ? <IconComponent className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" /> }
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {/* Optional: Sidebar footer content */}
      {/* <div className="mt-auto p-4">
          <p className="text-xs text-center">© {new Date().getFullYear()} {APP_NAME}</p>
      </div> */}
    </div>
  );
}
