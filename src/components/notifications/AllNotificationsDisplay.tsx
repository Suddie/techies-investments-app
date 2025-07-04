
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { BellRing, CheckCheck, AlertTriangle, Filter, Trash2, Loader2, XCircle } from 'lucide-react'; // Added XCircle
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { NotificationMessage } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthProvider';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch, Timestamp, getDocs } from 'firebase/firestore'; // Added getDocs
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type NotificationFilter = "all" | "unread" | "read";

export default function AllNotificationsDisplay() {
  const { userProfile } = useAuth();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [isProcessing, setIsProcessing] = useState(false); // For batch operations

  useEffect(() => {
    if (!userProfile) {
      setLoading(false);
      setNotifications([]);
      setError("User not authenticated. Please log in.");
      return;
    }

    setLoading(true);
    setError(null);
    const notificationsRef = collection(db, "notifications");
    
    // Simplified Firestore query: always fetch based on userId and order by timestamp.
    // 'isRead' filtering will be done client-side.
    const q = query(
      notificationsRef,
      where("userId", "in", [userProfile.uid, "all"]),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let fetchedNotifications: NotificationMessage[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp || Date.now());
        fetchedNotifications.push({
          id: doc.id,
          ...data,
          timestamp,
        } as NotificationMessage);
      });

      // Client-side filtering based on the 'filter' state
      if (filter === "unread") {
        fetchedNotifications = fetchedNotifications.filter(n => !n.isRead);
      } else if (filter === "read") {
        fetchedNotifications = fetchedNotifications.filter(n => n.isRead);
      }

      setNotifications(fetchedNotifications);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching notifications:", err);
      const errorMessage = `Could not fetch notifications. This might be due to missing Firestore indexes or permissions. Details: ${err.message}. Please check your browser's developer console for a link to create the required Firestore index.`;
      setError(errorMessage);
      toast({
        title: "Notification Error",
        description: "Failed to load notifications. Check console for details, including a link to create Firestore indexes if needed.",
        variant: "destructive",
        duration: 10000,
      });
      setLoading(false);
      setNotifications([]);
    });

    return () => unsubscribe();
  }, [userProfile, db, toast, filter]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const notificationRef = doc(db, "notifications", notificationId);
      await updateDoc(notificationRef, { isRead: true });
      // No toast needed, UI will update
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      toast({ title: "Error", description: `Failed to mark as read: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleMarkAllAsRead = async () => {
    if (!userProfile || isProcessing) return;

    // Query for unread notifications related to the user to mark them.
    // This query is specific for the write operation.
    const unreadQuery = query(
      collection(db, "notifications"),
      where("userId", "in", [userProfile.uid, "all"]),
      where("isRead", "==", false)
    );
    
    setIsProcessing(true);
    try {
      const snapshot = await getDocs(unreadQuery); // Use getDocs for a one-time fetch for the write operation
      if (snapshot.empty) {
        toast({ title: "No new notifications", description: "All notifications are already read." });
        setIsProcessing(false);
        return;
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach(docSnapshot => {
        batch.update(docSnapshot.ref, { isRead: true });
      });
      await batch.commit();
      toast({ title: "Success", description: "All visible unread notifications marked as read." });
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error);
      toast({ title: "Error", description: `Failed to mark all as read: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const unreadCount = useMemo(() => {
    // When filter is 'all', unreadCount is based on all notifications.
    // When filter is 'unread', unreadCount is just the length of the currently displayed (already filtered) list.
    // When filter is 'read', unreadCount is 0 for the current view.
    // To be accurate for the badge, we should always count unread from the *original potential dataset*.
    // However, since client-side filtering is now active, the `notifications` array is already filtered.
    // For simplicity, the unreadCount for the "Mark all as read" button will reflect unread items in the *current view*.
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const getNotificationIcon = (type: NotificationMessage['type']) => {
    switch (type) {
      case 'reminder': return <BellRing className="h-4 w-4 text-blue-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'alert': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'success': return <CheckCheck className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-700" />; // Added error icon
      default: return <BellRing className="h-4 w-4 text-gray-500" />; // info
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-9 w-28" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border rounded-md">
                <Skeleton className="h-8 w-8 rounded-full mt-1" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-6" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
                <CardTitle>All Notifications</CardTitle>
                <CardDescription>View and manage all your notifications.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(value) => setFilter(value as NotificationFilter)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2 sm:hidden md:inline-flex" />
                    <SelectValue placeholder="Filter notifications" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Notifications</SelectItem>
                    <SelectItem value="unread">Unread Only</SelectItem>
                    <SelectItem value="read">Read Only</SelectItem>
                </SelectContent>
            </Select>
            {unreadCount > 0 && !error && ( // unreadCount refers to visible unread items
                <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} disabled={isProcessing || unreadCount === 0}>
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
                  Mark all read
                </Button>
            )}
            </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {error ? (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Notifications</AlertTitle>
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center text-muted-foreground py-16 px-4">
            <BellRing className="mx-auto h-12 w-12 mb-3 text-muted-foreground/70" />
            <p className="text-lg">No notifications found.</p>
            <p className="text-sm text-muted-foreground">
              {filter === 'unread' ? "You're all caught up!" : 
               filter === 'read' ? "No read notifications to display." : 
               "It's quiet here... No notifications yet."}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-280px)]"> {/* Adjust height as needed */}
            <ul className="space-y-2 p-4">
              {notifications.map(notification => (
                <li
                  key={notification.id}
                  className={`p-3 rounded-lg border flex items-start gap-3 transition-colors
                    ${notification.isRead ? 'bg-muted/40 hover:bg-muted/60' : 'bg-card hover:bg-accent/30 border-primary/30 shadow-sm'}`}
                >
                  <div className={`mt-1 p-1.5 rounded-full ${notification.isRead ? 'bg-muted' : 
                    notification.type === 'error' ? 'bg-red-100 dark:bg-red-900/30' : 
                    notification.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' : 
                    'bg-primary/10' 
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${notification.isRead ? 'font-normal text-muted-foreground' : 'font-semibold text-foreground'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary disabled:opacity-50" 
                      onClick={() => handleMarkAsRead(notification.id)}
                      title="Mark as read"
                      disabled={isProcessing}
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
       {notifications.length > 0 && !error && (
        <CardFooter className="py-3 px-4 border-t">
            <p className="text-xs text-muted-foreground">
                Displaying {notifications.length} notification(s) based on filter.
            </p>
        </CardFooter>
       )}
    </Card>
  );
}

    
