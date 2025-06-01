
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import React, { useState } from "react";
import type { ManualNotificationFormValues, NotificationType } from "@/lib/types";
import { useFirebase } from "@/contexts/FirebaseProvider";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { Loader2, Send } from "lucide-react";

const notificationTypes: NotificationType[] = ['info', 'reminder', 'warning', 'alert', 'success', 'error'];

const formSchema = z.object({
  targetType: z.enum(['all', 'specific'], { required_error: "Please select a target." }),
  targetUserEmail: z.string().email("Invalid email format.").optional(),
  message: z.string().min(10, "Message must be at least 10 characters.").max(1000, "Message is too long."),
  type: z.enum(notificationTypes, { required_error: "Please select a notification type." }),
  relatedLink: z.string().url("Must be a valid URL (e.g., /dashboard or https://...).").optional().or(z.literal("")),
}).refine(data => {
  if (data.targetType === 'specific' && !data.targetUserEmail) {
    return false;
  }
  return true;
}, {
  message: "Email is required for specific user notifications.",
  path: ["targetUserEmail"],
});

export default function ManualNotificationForm() {
  const { db } = useFirebase();
  const { userProfile: adminProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ManualNotificationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetType: 'all',
      targetUserEmail: "",
      message: "",
      type: 'info',
      relatedLink: "",
    },
  });

  const targetTypeWatch = form.watch("targetType");

  async function onSubmit(values: ManualNotificationFormValues) {
    if (!adminProfile || adminProfile.accessLevel > 1) {
      toast({ title: "Permission Denied", description: "You do not have permission to send notifications.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    let targetUserId: string | 'all' = 'all';

    if (values.targetType === 'specific') {
      if (!values.targetUserEmail) { // Should be caught by Zod, but double-check
        form.setError("targetUserEmail", { message: "Email is required." });
        setIsLoading(false);
        return;
      }
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", values.targetUserEmail));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          form.setError("targetUserEmail", { message: "User with this email not found." });
          setIsLoading(false);
          return;
        }
        targetUserId = querySnapshot.docs[0].id; // Get the UID of the found user
      } catch (error: any) {
        toast({ title: "Error finding user", description: error.message, variant: "destructive" });
        setIsLoading(false);
        return;
      }
    }

    try {
      const notificationData = {
        userId: targetUserId,
        message: values.message,
        type: values.type,
        timestamp: serverTimestamp(),
        isRead: false,
        relatedLink: values.relatedLink || null, // Store null if empty string
        createdBy: adminProfile.uid, // Optional: track who created the manual notification
        createdByName: adminProfile.name,
      };
      await addDoc(collection(db, "notifications"), notificationData);
      toast({ title: "Notification Sent", description: "The notification has been successfully created." });
      form.reset();
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast({ title: "Error Sending Notification", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Create Manual Notification</CardTitle>
        <CardDescription>Compose and send notifications to all users or a specific user.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="targetType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Target Audience</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="all" /></FormControl>
                        <FormLabel className="font-normal">All Users</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="specific" /></FormControl>
                        <FormLabel className="font-normal">Specific User</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {targetTypeWatch === 'specific' && (
              <FormField
                control={form.control}
                name="targetUserEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target User Email</FormLabel>
                    <FormControl>
                      <Input placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormDescription>Enter the email address of the user to notify.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notification Message</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter your notification message here..." rows={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notification Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select notification type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {notificationTypes.map(type => (
                        <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="relatedLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Related Link (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="/contributions or https://example.com/info" {...field} />
                  </FormControl>
                  <FormDescription>A relative path (e.g., /dashboard) or an absolute URL.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {isLoading ? "Sending..." : "Send Notification"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
