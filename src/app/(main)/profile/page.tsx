
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { useAuth } from "@/contexts/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { LockKeyhole } from "lucide-react";

export default function ProfilePage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "NA";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (loading || !userProfile) {
    return (
      <ProtectedRoute>
        <PageHeader title="My Profile" description="View and manage your profile details." />
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
             <div>
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-40" />
          </CardContent>
        </Card>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageHeader title="My Profile" description="View and manage your profile details." />
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center space-x-0 sm:space-x-4 space-y-3 sm:space-y-0">
            <Avatar className="h-20 w-20 text-xl">
              <AvatarImage src={userProfile.photoURL || ""} alt={userProfile.name || "User"} />
              <AvatarFallback>{getInitials(userProfile.name)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl text-center sm:text-left">{userProfile.name}</CardTitle>
              <CardDescription className="text-center sm:text-left">
                {userProfile.role} - Access Level: {userProfile.accessLevel}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={userProfile.email || ""} readOnly disabled />
              <p className="text-xs text-muted-foreground mt-1">Your email address cannot be changed here.</p>
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Input id="role" type="text" value={userProfile.role || ""} readOnly disabled />
            </div>
             <div>
              <Label htmlFor="accessLevel">Access Level</Label>
              <Input id="accessLevel" type="text" value={userProfile.accessLevel?.toString() || ""} readOnly disabled />
            </div>
             <div>
              <Label htmlFor="status">Account Status</Label>
              <Input id="status" type="text" value={userProfile.status || "Active"} readOnly disabled />
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Security</h3>
            <Button onClick={() => router.push('/change-password')} variant="outline">
              <LockKeyhole className="mr-2 h-4 w-4" />
              Change Password
            </Button>
            {userProfile.requiresPasswordChange && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                    You are required to change your password on your next login.
                </p>
            )}
          </div>

          {/* Placeholder for future profile editing functionality e.g., Name, Photo */}
          {/* 
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-2">Edit Profile</h3>
            <p className="text-sm text-muted-foreground">Name and photo editing coming soon.</p>
          </div>
          */}
        </CardContent>
      </Card>
    </ProtectedRoute>
  );
}
