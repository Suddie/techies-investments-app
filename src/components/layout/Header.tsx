
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Added Popover
import { Menu, Bell } from "lucide-react";
import { UserNav } from "./UserNav";
import SidebarNavigation from "./SidebarNavigation"; 
import { useSettings } from "@/contexts/SettingsProvider";
import Image from "next/image";
import NotificationList from "@/components/notifications/NotificationList"; // Added NotificationList
import React, { useState, useEffect } from "react"; // Added React, useState, useEffect
import { useAuth } from "@/contexts/AuthProvider"; // Added useAuth
import { useFirebase } from "@/contexts/FirebaseProvider"; // Added useFirebase
import { collection, query, where, onSnapshot,getCountFromServer } from "firebase/firestore"; // Added Firestore imports


export default function Header() {
  const { settings, loading: settingsLoading } = useSettings();
  const { userProfile } = useAuth(); // Get userProfile
  const { db } = useFirebase(); // Get db instance
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  
  useEffect(() => {
    if (!userProfile || !db) {
      setUnreadNotificationCount(0);
      return;
    }

    const notificationsRef = collection(db, "notifications");
    // Query for unread notifications specific to the user or 'all'
    const q = query(
      notificationsRef,
      where("userId", "in", [userProfile.uid, "all"]),
      where("isRead", "==", false)
    );

    // Use onSnapshot to listen for real-time changes to the unread count
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // getCountFromServer is more efficient if you only need the count
      // However, onSnapshot gives real-time updates if a notification is read elsewhere.
      // For simplicity with onSnapshot, we just get the size of the snapshot.
      setUnreadNotificationCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching unread notification count:", error);
      setUnreadNotificationCount(0); // Reset on error
    });

    return () => unsubscribe(); // Cleanup listener on component unmount
  }, [userProfile, db]);


  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 shadow-sm">
      <div className="flex items-center">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <SidebarNavigation />
          </SheetContent>
        </Sheet>
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold md:text-base ml-2 md:ml-0">
          {settings.logoUrl ? (
             <Image src={settings.logoUrl} alt={settings.appName} width={32} height={32} data-ai-hint="logo company" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          )}
          <span className="text-foreground">{settingsLoading ? "Loading..." : settings.appName}</span>
        </Link>
      </div>
      
      <div className="ml-auto flex items-center gap-2 md:gap-4"> {/* Adjusted gap for responsiveness */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full relative">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Toggle notifications</span>
              {unreadNotificationCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full md:w-[400px] p-0" align="end"> {/* Adjusted width and removed padding */}
            <NotificationList />
          </PopoverContent>
        </Popover>
        <UserNav />
      </div>
    </header>
  );
}
