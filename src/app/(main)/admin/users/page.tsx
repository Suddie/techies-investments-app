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
    // IMPORTANT: As per requirements (5.1. User Creation):
    // If creating users client-side using Firebase's createUserWithEmailAndPassword,
    // the Admin's current authentication session WILL BE REPLACED by the new user's session.
    // This means the Admin will be effectively logged out and the new user logged in.
    // The Admin would then need to manually log out and log back in with their own credentials.
    // This is often undesirable.
    //
    // RECOMMENDED ALTERNATIVE: Use a Firebase Cloud Function callable by an authenticated Admin.
    // This function would use the Firebase Admin SDK to create the new user,
    // which does NOT affect the calling Admin's client-side session.
    // This provides a much smoother and safer experience for the Admin.
    //
    // Example (conceptual - Cloud Function 'createUser' would need to be deployed):
    // const userManagementFunction = httpsCallable(functions, userId ? 'updateUser' : 'createUser');
    try {
      console.log("Saving user (mock operation):", { ...data, uid: userId });
      // await userManagementFunction({ userData: data, userId }); 
      // Mocking success:
      toast({
        title: `User ${userId ? 'updated' : 'created'} successfully!`,
        description: `${data.name} (${data.email}) has been ${userId ? 'updated' : 'added'}. (Mock Operation)`,
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
