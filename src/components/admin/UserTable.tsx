"use client";

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit2, UserX, KeyRound, UserCheck, AlertTriangle, UserCog } from "lucide-react";
import type { UserProfile } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ACCESS_LEVELS } from '@/lib/constants';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface UserTableProps {
  onEditUser: (user: UserProfile) => void;
}

export default function UserTable({ onEditUser }: UserTableProps) {
  const { db } = useFirebase();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const usersCollectionRef = collection(db, "users");
    const q = query(usersCollectionRef, orderBy("name", "asc")); // Order by name

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedUsers: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        // Explicitly cast to UserProfile, ensuring all required fields are present or handled.
        // Firestore data might not perfectly match the type, so provide defaults or handle missing fields.
        const data = doc.data();
        fetchedUsers.push({
          uid: doc.id,
          email: data.email || null,
          name: data.name || "Unnamed User",
          role: data.role || "Member", // Default to 'Member' if not set
          accessLevel: data.accessLevel || 3, // Default to accessLevel 3 if not set
          status: data.status || 'Active', // Default to 'Active'
          requiresPasswordChange: data.requiresPasswordChange ?? false, // Default to false
          photoURL: data.photoURL || null,
          // Add other fields from UserProfile with defaults if necessary
        } as UserProfile);
      });
      setUsers(fetchedUsers);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      toast({
        title: "Error Fetching Users",
        description: "Could not load user data from Firestore. " + error.message,
        variant: "destructive",
      });
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, [db, toast]);

  const updateUserStatus = async (userId: string, newStatus: 'Active' | 'Inactive') => {
    const userDocRef = doc(db, "users", userId);
    try {
      await updateDoc(userDocRef, { status: newStatus });
      toast({
        title: `User ${newStatus === 'Active' ? 'Activated' : 'Deactivated'}`,
        description: `User status has been updated to ${newStatus}.`,
      });
    } catch (error: any) {
      console.error(`Error updating user status to ${newStatus}:`, error);
      toast({
        title: "Update Failed",
        description: `Could not update user status: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleDeactivateUser = (userId: string) => {
    updateUserStatus(userId, 'Inactive');
  };
  
  const handleActivateUser = (userId: string) => {
    updateUserStatus(userId, 'Active');
  };

  const handleResetPassword = (userEmail: string) => {
    // Actual password reset should be done via Firebase Auth, potentially a Cloud Function triggered by Admin.
    // For now, this is a placeholder.
    console.log("Initiate password reset for (mock operation):", userEmail);
    toast({
      title: "Password Reset (Mock)",
      description: `Password reset for ${userEmail} would be initiated here. This is currently a mock action.`,
      duration: 5000,
    });
  };


  if (loading) {
    return (
      <div className="space-y-2 mt-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
      </div>
    );
  }
  
  if (users.length === 0 && !loading) {
    return (
       <Alert variant="default" className="mt-4 bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
        <UserCog className="h-4 w-4 !text-blue-500 dark:!text-blue-400" />
        <AlertTitle>No Users Found</AlertTitle>
        <AlertDescription>
          There are no user profiles in the database. Admins can add new users using the "Add New User" button.
          Remember to also create corresponding authentication records in Firebase Authentication if not done through the app.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {/* Removed the "Mock Data" alert as we are now fetching real data. */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Access Level</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.uid}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>{ACCESS_LEVELS[user.accessLevel as keyof typeof ACCESS_LEVELS] || user.accessLevel}</TableCell>
              <TableCell>
                <Badge variant={user.status === 'Active' ? 'secondary' : 'outline'} 
                      className={user.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200 border-green-300 dark:border-green-600' : 'border-destructive/50 text-destructive dark:text-destructive/80 dark:border-destructive/70'}>
                  {user.status}
                  {user.requiresPasswordChange && user.status === 'Active' && (
                     <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <AlertTriangle className="ml-1.5 h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 inline-block" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Password change required</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEditUser(user)}>
                      <Edit2 className="mr-2 h-4 w-4" /> Edit User Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => user.email && handleResetPassword(user.email)}>
                      <KeyRound className="mr-2 h-4 w-4" /> Reset Password (Mock)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {user.status === 'Active' ? (
                      <DropdownMenuItem onClick={() => handleDeactivateUser(user.uid)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <UserX className="mr-2 h-4 w-4" /> Deactivate User
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleActivateUser(user.uid)} className="text-green-600 focus:text-green-700 focus:bg-green-500/10 dark:text-green-400 dark:focus:text-green-300 dark:focus:bg-green-600/20">
                        <UserCheck className="mr-2 h-4 w-4" /> Activate User
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
