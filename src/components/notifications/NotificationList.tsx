
"use client";

import { useState, useEffect } from 'react';
import { BellRing, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { NotificationMessage } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

// Mock notifications data
const mockNotifications: NotificationMessage[] = [
  { id: '1', userId: 'all', message: 'Monthly contribution reminder for July is out.', type: 'reminder', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), isRead: false, relatedLink: '/contributions' },
  { id: '2', userId: 'all', message: 'Project Alpha milestone "Foundation" completed!', type: 'info', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), isRead: false },
  { id: '3', userId: 'user123', message: 'Your contribution for June is overdue. A penalty might be applied.', type: 'warning', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), isRead: true },
  { id: '4', userId: 'all', message: 'System maintenance scheduled for Sunday 2 AM.', type: 'alert', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72), isRead: false },
];


export default function NotificationList() {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  useEffect(() => {
    // In a real app, fetch notifications for the current user
    // For now, use mock data
    setNotifications(mockNotifications.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()));
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
    // In a real app, update notification status in Firestore
  };
  
  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
     // In a real app, update notification status in Firestore (e.g. mark as dismissed or soft delete)
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-1">
              {unreadCount} new
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <BellRing className="mx-auto h-12 w-12 mb-2" />
            <p>No new notifications</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <ul className="space-y-3">
              {notifications.map(notification => (
                <li
                  key={notification.id}
                  className={`p-3 rounded-md border flex items-start gap-3 transition-colors
                    ${notification.isRead ? 'bg-muted/50' : 'bg-card hover:bg-accent/50'}`}
                >
                  <div className={`mt-1 p-1.5 rounded-full ${
                    notification.type === 'reminder' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                    notification.type === 'warning' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                    notification.type === 'alert' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                    'bg-green-500/20 text-green-600 dark:text-green-400'
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
                    {!notification.isRead && (
                      <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-1" onClick={() => markAsRead(notification.id)}>
                        Mark as read
                      </Button>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => dismissNotification(notification.id)}>
                    <X className="h-4 w-4"/>
                    <span className="sr-only">Dismiss notification</span>
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

