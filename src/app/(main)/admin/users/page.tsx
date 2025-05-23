"use client";

import PageHeader from "@/components/common/PageHeader";
import UserTable from "@/components/admin/UserTable";
import UserForm from "@/components/admin/UserForm";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import type { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
// Firebase imports for actual user creation/update (example with Admin SDK or Cloud Functions)
// import { functions } from '@/lib/firebase'; // Assuming functions is initialized
// import { httpsCallable } from 'firebase/functions';

export default function UserManagementPage() {
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  const handleAddNewUser = () => {
    setEditingUser(null);
    setIsUserFormOpen(true);
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setIsUserFormOpen(true);
  };

  const handleSaveUser = async (data: any, userId?: string) => {
    // In a real app, call a Firebase Cloud Function to create/update user
    // This function would use Firebase Admin SDK.
    // For createUserWithEmailAndPassword client-side by Admin, admin session would switch.
    // That needs careful handling (logout admin, new user logs in, changes pw, admin logs back in).
    // Cloud Function is safer for admin user creation.
    
    // const userManagementFunction = httpsCallable(functions, userId ? 'updateUser' : 'createUser');
    try {
      console.log("Saving user:", { ...data, uid: userId });
      // await userManagementFunction({ userData: data, userId }); 
      // Mocking success:
      toast({
        title: `User ${userId ? 'updated' : 'created'} successfully!`,
        description: `${data.name} (${data.email}) has been ${userId ? 'updated' : 'added'}.`,
      });
      setIsUserFormOpen(false);
      setEditingUser(null);
      // Here you would typically re-fetch or update the user list state
    } catch (error: any) {
      console.error("Error saving user:", error);
      toast({
        title: "Error saving user",
        description: error.message || "An unknown error occurred.",
        variant: "destructive",
      });
    }
  };


  return (
    <>
      <PageHeader
        title="User Management"
        description="Add, edit, or deactivate user accounts."
        actions={
          <Dialog open={isUserFormOpen} onOpenChange={setIsUserFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNewUser}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <UserForm 
                user={editingUser} 
                onSave={handleSaveUser}
                onCancel={() => {
                  setIsUserFormOpen(false);
                  setEditingUser(null);
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />
      <div className="border shadow-sm rounded-lg p-2">
        <UserTable onEditUser={handleEditUser} />
      </div>
    </>
  );
}
