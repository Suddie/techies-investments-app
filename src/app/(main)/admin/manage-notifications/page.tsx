'use client';

import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable, HttpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where, getFirestore } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { FaTrashAlt, FaPaperPlane } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Spinner from '@/components/common/Spinner'; // Assuming you have a spinner component at this path

// Define types for our data
interface User {
  id: string;
  name: string;
}

interface SentNotification {
  id: string;
  recipient: string;
  message: string;
  notificationType: string;
  createdAt: string;
}

export default function ManageNotificationsPage() {
  const [targetAudience, setTargetAudience] = useState('all');
  const [specificUserId, setSpecificUserId] = useState('');
  const [message, setMessage] = useState('');
  const [notificationType, setNotificationType] = useState('info');
  
  const [users, setUsers] = useState<User[]>([]);
  const [sentNotifications, setSentNotifications] = useState<SentNotification[]>([]);
  
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Memoize callable functions to prevent re-creation on re-renders
  const [callableFuncs] = useState<{ [key: string]: HttpsCallable<any, any> }>(() => {
    const functions = getFunctions();
    return {
      send: httpsCallable(functions, 'adminSendNotification'),
      get: httpsCallable(functions, 'adminGetSentNotifications'),
      delete: httpsCallable(functions, 'adminDeleteNotification'),
    };
  });

  // Fetch active users for the dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const db = getFirestore();
        const usersQuery = query(collection(db, "users"), where("status", "==", "Active"));
        const querySnapshot = await getDocs(usersQuery);
        const usersList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || `User (${doc.id.substring(0, 5)})`,
        }));
        setUsers(usersList.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Error fetching users: ", error);
        toast.error('Failed to load users.');
      }
    };
    fetchUsers();
  }, []);

  // Fetch sent notification history
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const result = await callableFuncs.get();
      setSentNotifications(result.data as SentNotification[]);
    } catch (error: any) {
      console.error("Error fetching notification history: ", error);
      toast.error(error.message || 'Failed to load notification history.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [callableFuncs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      return toast.error('Notification message cannot be empty.');
    }
    if (targetAudience === 'specific' && !specificUserId) {
      return toast.error('Please select a specific user.');
    }

    setIsSending(true);
    try {
      const payload = {
        targetAudience,
        userId: targetAudience === 'specific' ? specificUserId : null,
        message,
        notificationType,
      };
      const result: any = await callableFuncs.send(payload);
      toast.success(result.data.message || 'Notification sent successfully!');
      setMessage(''); // Clear message field
      await fetchHistory(); // Refresh the list of sent notifications
    } catch (error: any) {
      console.error("Error sending notification: ", error);
      toast.error(error.message || 'An unknown error occurred.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (window.confirm('Are you sure? This will delete the notification for the user, or the entire batch if sent to all users.')) {
        try {
            const result: any = await callableFuncs.delete({ notificationId });
            toast.success(result.data.message || 'Notification deleted!');
            await fetchHistory(); // Refresh the list of sent notifications
        } catch (error: any) {
            console.error("Error deleting notification:", error);
            toast.error(error.message || 'Failed to delete notification.');
        }
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Manual Notification</CardTitle>
          <CardDescription>Compose and send notifications to all active users or a specific user.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="font-semibold">Target Audience</Label>
              <RadioGroup value={targetAudience} onValueChange={setTargetAudience} className="flex items-center gap-4 mt-2">
                <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="all" /><Label htmlFor="all">All Users</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="specific" id="specific" /><Label htmlFor="specific">Specific User</Label></div>
              </RadioGroup>
            </div>

            {targetAudience === 'specific' && (
              <div>
                <Label htmlFor="specificUserId" className="font-semibold">Select User</Label>
                <Select value={specificUserId} onValueChange={setSpecificUserId}>
                  <SelectTrigger id="specificUserId"><SelectValue placeholder="-- Select a user --" /></SelectTrigger>
                  <SelectContent>
                    {users.map((user) => ( <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem> ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label htmlFor="message" className="font-semibold">Notification Message</Label>
              <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Enter your notification message here..." />
            </div>

            <div>
              <Label htmlFor="notificationType" className="font-semibold">Notification Type</Label>
              <Select value={notificationType} onValueChange={setNotificationType}>
                <SelectTrigger id="notificationType"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info (Blue)</SelectItem>
                  <SelectItem value="success">Success (Green)</SelectItem>
                  <SelectItem value="warning">Warning (Yellow)</SelectItem>
                  <SelectItem value="error">Error (Red)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={isSending}>
              {isSending ? <Spinner size="sm" /> : <FaPaperPlane className="mr-2 h-4 w-4" />}
              Send Notification
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sent Notifications History</CardTitle>
          <CardDescription>A log of the most recently sent manual notifications.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? <div className="flex justify-center p-8"><Spinner /></div> : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Date Sent</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sentNotifications.length > 0 ? sentNotifications.map((notif) => (
                    <TableRow key={notif.id}>
                      <TableCell className="font-medium">{notif.recipient}</TableCell>
                      <TableCell className="max-w-sm break-words">{notif.message}</TableCell>
                      <TableCell>{new Date(notif.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(notif.id)}>
                          <FaTrashAlt className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center">No notifications have been sent yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}