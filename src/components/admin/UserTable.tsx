
"use client";

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit2, UserX, KeyRound, UserCheck, AlertTriangle } from "lucide-react";
import type { UserProfile } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ACCESS_LEVELS, ROLES } from '@/lib/constants';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Mock data - replace with actual data fetching
const mockUsers: UserProfile[] = [
  { uid: 'admin1', email: 'admin@example.com', name: 'Alice Admin', role: 'Admin', accessLevel: 1, status: 'Active' },
  { uid: 'member1', email: 'member1@example.com', name: 'Bob Member', role: 'Member', accessLevel: 3, status: 'Active', requiresPasswordChange: true },
  { uid: 'finance1', email: 'finance@example.com', name: 'Charlie Finance', role: 'Treasurer', accessLevel: 1, status: 'Active' },
  { uid: 'inactive1', email: 'inactive@example.com', name: 'David Inactive', role: 'Member', accessLevel: 3, status: 'Inactive' },
];

interface UserTableProps {
  onEditUser: (user: UserProfile) => void;
  // Add other action handlers as props e.g. onDeactivateUser, onResetPassword
}

export default function UserTable({ onEditUser }: UserTableProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, fetch users from Firestore
    setUsers(mockUsers);
    setLoading(false);
  }, []);

  const handleDeactivateUser = (userId: string) => {
    console.log("Deactivate user (mock operation):", userId);
    // Implement Firestore update to set status to 'Inactive'
    // Update local state or re-fetch
    setUsers(prev => prev.map(u => u.uid === userId ? {...u, status: 'Inactive'} : u));
  };
  
  const handleActivateUser = (userId: string) => {
    console.log("Activate user (mock operation):", userId);
    // Implement Firestore update to set status to 'Active'
    setUsers(prev => prev.map(u => u.uid === userId ? {...u, status: 'Active'} : u));
  };

  const handleResetPassword = (userId: string) => {
    console.log("Reset password for user (mock operation):", userId);
    // Implement Firebase Auth password reset or Cloud Function call
  };


  if (loading) {
    return <div className="animate-pulse space-y-2 mt-4"><div className="h-10 bg-muted rounded w-full"></div><div className="h-10 bg-muted rounded w-full"></div><div className="h-10 bg-muted rounded w-full"></div></div>;
  }

  return (
    <>
      <Alert variant="default" className="mb-4 bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300">
        <AlertTriangle className="h-4 w-4 !text-yellow-500 dark:!text-yellow-400" />
        <AlertTitle>Developer Note: Mock Data</AlertTitle>
        <AlertDescription>
          This table currently displays **mock user data**. User creation, editing, and status changes made via the UI are **not yet saved to Firestore**. 
          For security rules based on user roles/access levels to work correctly, corresponding user documents must exist with the correct fields in your Firestore 'users' collection.
        </AlertDescription>
      </Alert>
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
                      className={user.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200 border-green-300 dark:border-green-600' : 'border-destructive/50 text-destructive'}>
                  {user.status}
                  {user.requiresPasswordChange && user.status === 'Active' && " (PW Change Req.)"}
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
                    <DropdownMenuLabel>Actions (Mock)</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEditUser(user)}>
                      <Edit2 className="mr-2 h-4 w-4" /> Edit User
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleResetPassword(user.uid)}>
                      <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {user.status === 'Active' ? (
                      <DropdownMenuItem onClick={() => handleDeactivateUser(user.uid)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <UserX className="mr-2 h-4 w-4" /> Deactivate
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleActivateUser(user.uid)} className="text-green-600 focus:text-green-700 focus:bg-green-500/10">
                        <UserCheck className="mr-2 h-4 w-4" /> Activate
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
