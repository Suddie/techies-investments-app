
"use client";

import PageHeader from "@/components/common/PageHeader";
import UserTable from "@/components/admin/UserTable";
import UserForm from "@/components/admin/UserForm";
import { Button } from "@/components/ui/button";
import { PlusCircle, LogOut, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import type { UserProfile, UserFormValues as UserFormSchemaValues } from "@/lib/types"; 
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/contexts/FirebaseProvider";
import { useAuth } from "@/contexts/AuthProvider"; 
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ROLES } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function UserManagementPage() {
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const { toast } = useToast();
  const { auth, db } = useFirebase();
  const { user: currentAdminUser, userProfile: currentAdminProfile } = useAuth(); 

  const handleAddNewUser = () => {
    setEditingUser(null);
    setIsUserFormOpen(true);
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setIsUserFormOpen(true);
  };

  const handleSaveUser = async (data: UserFormSchemaValues, userIdToUpdate?: string) => {
    const accessLevel = ROLES[data.role]?.accessLevel;
    if (accessLevel === undefined) {
      toast({ title: "Error", description: "Invalid role selected.", variant: "destructive" });
      return;
    }

    const userProfileData: Omit<UserProfile, "uid" | "photoURL" | "email"> & { email?: string | null, createdAt?: any, tpin?: string } = {
      name: data.name,
      role: data.role,
      accessLevel: accessLevel,
      status: data.status,
      requiresPasswordChange: data.requiresPasswordChange,
      tpin: data.tpin || "", // Save TPIN
    };

    if (userIdToUpdate) { 
      try {
        const userDocRef = doc(db, "users", userIdToUpdate);
        await updateDoc(userDocRef, {
          name: data.name,
          role: data.role,
          accessLevel: accessLevel,
          status: data.status,
          requiresPasswordChange: data.requiresPasswordChange,
          tpin: data.tpin || "", // Update TPIN
        });
        toast({
          title: "User Profile Updated",
          description: `${data.name}'s profile has been successfully updated in Firestore.`,
        });
        setIsUserFormOpen(false);
        setEditingUser(null);
      } catch (error: any) {
        console.error("Error updating user profile:", error);
        toast({
          title: "Profile Update Failed",
          description: error.message || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } else { 
      if (!data.email || !data.password) {
        toast({ title: "Missing Information", description: "Email and password are required for new users.", variant: "destructive" });
        return;
      }
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const newAuthUser = userCredential.user;
        
        userProfileData.email = data.email; 
        userProfileData.createdAt = serverTimestamp();
        
        const userDocRef = doc(db, "users", newAuthUser.uid);
        await setDoc(userDocRef, userProfileData);

        toast({
          title: "User Created Successfully!",
          description: `${data.name} (${data.email}) has been created. IMPORTANT: You (Admin) are now logged in as the new user. Please log out and log back in with your admin credentials.`,
          duration: 15000, 
          action: (
            <Button variant="outline" size="sm" onClick={async () => {
              await signOut(auth);
            }}>
              <LogOut className="mr-2 h-4 w-4" /> Log Out Now
            </Button>
          )
        });
        setIsUserFormOpen(false);
        setEditingUser(null);
      } catch (error: any) {
        console.error("Error creating user:", error);
        toast({
          title: "User Creation Failed",
          description: error.message || "An unknown error occurred. If the user already exists in Firebase Authentication but not Firestore, try editing them instead.",
          variant: "destructive",
          duration: 10000,
        });
      }
    }
  };


  return (
    <>
      <PageHeader
        title="User Management"
        description="Add new users or edit existing user profiles, roles, and status. User authentication records are managed by Firebase Authentication, while profiles are stored in Firestore."
        actions={
          <Dialog open={isUserFormOpen} onOpenChange={(isOpen) => {
            setIsUserFormOpen(isOpen);
            if (!isOpen) setEditingUser(null); 
          }}>
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
       <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important: User Creation Process</AlertTitle>
          <AlertDescription>
            When an Admin creates a new user through the "Add New User" form:
            <ul className="list-disc pl-5 mt-1">
              <li>A new account is created in Firebase Authentication.</li>
              <li>A corresponding user profile document is created in Firestore.</li>
              <li><strong>The Admin's current session will be replaced by the new user's session.</strong> The Admin will be effectively logged in as the newly created user.</li>
              <li>The Admin must then manually log out and log back in with their own credentials to regain admin access.</li>
            </ul>
            This is a known behavior when using Firebase's client-side `createUserWithEmailAndPassword` SDK. For a smoother admin experience, a Cloud Function can be used for user creation in the future.
          </AlertDescription>
        </Alert>
      <div className="border shadow-sm rounded-lg p-2">
        <UserTable onEditUser={handleEditUser} />
      </div>
    </>
  );
}
