
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthProvider";
import { useFirebase } from "@/contexts/FirebaseProvider";
import { updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";

const formSchema = z.object({
  newPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ChangePasswordForm() {
  const { user, userProfile } = useAuth();
  const { auth, db } = useFirebase();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !userProfile) {
      setError("User not authenticated. Please login again.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updatePassword(user, values.newPassword);
      // Update requiresPasswordChange flag in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        requiresPasswordChange: false,
      });
      setSuccess("Password updated successfully! Redirecting to dashboard...");
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
      console.error("Password update error:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleCancel = () => {
    // If user was forced to change password, going "back" to profile might not be ideal
    // as they might be in a loop. Dashboard is a safer bet if they cancel a forced change.
    // However, if they navigated willingly from profile, going back to profile is fine.
    // For simplicity now, we'll go to dashboard if it was required, profile otherwise.
    if (userProfile?.requiresPasswordChange) {
        // Check if they somehow bypassed the initial dashboard redirect. If so, send them there.
        // Or if they are coming from login direct to change password.
        router.push('/dashboard'); 
    } else {
        router.push('/profile');
    }
  };

  return (
    <div className="w-full rounded-lg border bg-card text-card-foreground shadow-lg p-6 md:p-8">
      <h2 className="text-2xl font-semibold text-center mb-2 text-foreground">Change Your Password</h2>
      {userProfile?.requiresPasswordChange && !success && (
        <p className="text-sm text-muted-foreground text-center mb-6">
          Please set a new password to continue.
        </p>
      )}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
         <Alert variant="default" className="mb-4 bg-green-100 border-green-400 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300">
          <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm New Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto" disabled={loading}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel
            </Button>
            <Button type="submit" className="w-full flex-grow" disabled={loading || !!success}>
                {loading ? "Updating..." : "Change Password"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
