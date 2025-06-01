
"use client";

import React, { useState, useEffect } from 'react';
import { BellRing, CheckCheck, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { NotificationMessage } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthProvider';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch, Timestamp, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const MAX_NOTIFICATIONS_DISPLAYED = 20;

export default function NotificationList() {
  const { userProfile } = useAuth();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) {
      setLoading(false);
      setNotifications([]);
      return;
    }

    setLoading(true);
    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "in", [userProfile.uid, "all"]),
      orderBy("timestamp", "desc"),
      limit(MAX_NOTIFICATIONS_DISPLAYED)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedNotifications: NotificationMessage[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp || Date.now());
        fetchedNotifications.push({
          id: doc.id,
          ...data,
          timestamp,
        } as NotificationMessage);
      });
      setNotifications(fetchedNotifications);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      toast({
        title: "Error",
        description: "Could not fetch notifications. " + error.message,
        variant: "destructive",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile, db, toast]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, "notifications", notificationId);
      await updateDoc(notificationRef, { isRead: true });
      // Optimistic update (local state updates immediately via onSnapshot)
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      toast({
        title: "Error",
        description: `Failed to mark as read: ${error.message}`,
        variant: "destructive",
      });
    }
  };
  
  const handleMarkAllAsRead = async () => {
    if (!userProfile) return;

    const unreadNotifications = notifications.filter(n => !n.isRead && (n.userId === userProfile.uid || n.userId === 'all'));
    if (unreadNotifications.length === 0) {
      toast({ title: "No new notifications", description: "All notifications are already read." });
      return;
    }

    const batch = writeBatch(db);
    unreadNotifications.forEach(notification => {
      const notificationRef = doc(db, "notifications", notification.id);
      batch.update(notificationRef, { isRead: true });
    });

    try {
      await batch.commit();
      toast({ title: "Success", description: "All notifications marked as read." });
      // Local state will update via onSnapshot
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error);
      toast({
        title: "Error",
        description: `Failed to mark all as read: ${error.message}`,
        variant: "destructive",
      });
    }
  };
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <Card className="w-full md:w-[380px] shadow-none border-none">
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 p-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full mt-1" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="w-full md:w-[380px] shadow-none border-none">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Notifications</CardTitle>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
               <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all as read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {notifications.length === 0 ? (
          <div className="text-center text-muted-foreground py-10 px-4">
            <BellRing className="mx-auto h-10 w-10 mb-2 text-muted-foreground/70" />
            <p className="text-sm">No notifications yet.</p>
          </div>
        ) : (
          <ScrollArea className="h-[350px] px-4 pb-2">
            <ul className="space-y-3">
              {notifications.map(notification => (
                <li
                  key={notification.id}
                  className={`p-3 rounded-md border flex items-start gap-3 transition-colors
                    ${notification.isRead ? 'bg-muted/30 hover:bg-muted/50' : 'bg-card hover:bg-accent/20 border-primary/20'}`}
                >
                  <div className={`mt-1 p-1.5 rounded-full ${
                    notification.type === 'reminder' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                    notification.type === 'warning' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                    notification.type === 'alert' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                    'bg-green-500/20 text-green-600 dark:text-green-400' // info, success, error
                  }`}>
                    <BellRing className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${notification.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary" 
                      onClick={() => handleMarkAsRead(notification.id)}
                      title="Mark as read"
                    >
                      <CheckCheck className="h-4 w-4"/>
                      <span className="sr-only">Mark as read</span>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
       {notifications.length > 0 && (
        <CardFooter className="py-2 px-4 border-t">
            <p className="text-xs text-muted-foreground">Showing latest {Math.min(notifications.length, MAX_NOTIFICATIONS_DISPLAYED)} notifications.</p>
        </CardFooter>
       )}
    </Card>
  );
}
