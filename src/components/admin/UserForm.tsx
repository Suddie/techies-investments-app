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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { UserProfile, UserRole, UserFormValues as UserFormSchemaValues } from '@/lib/types'; // Updated import
import { ROLES } from '@/lib/constants';
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"; 
import React, { useEffect, useState } from "react";

const rolesArray = Object.keys(ROLES) as UserRole[];

// Schema for the form
const userFormZodSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  role: z.enum(rolesArray),
  password: z.string().optional(), // Password handling is conditional
  status: z.enum(['Active', 'Inactive']),
  requiresPasswordChange: z.boolean().default(true),
}).superRefine((data, ctx) => {
  // Conditionally require password if it's a new user (user prop is not passed)
  // This refinement is tricky here because `user` prop isn't part of `data`.
  // This logic is better handled in the onSubmit or by passing a flag to the schema.
  // For now, password validation will be handled in the `handleSubmit` function.
});


interface UserFormProps {
  user?: UserProfile | null; // For editing existing user
  onSave: (data: UserFormSchemaValues, userId?: string) => Promise<void>;
  onCancel: () => void;
}

export default function UserForm({ user, onSave, onCancel }: UserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<UserFormSchemaValues>({ // Use the imported type
    resolver: zodResolver(userFormZodSchema), // Use the Zod schema
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      role: user?.role || "Member",
      password: "", // Always start with empty password field
      status: user?.status || 'Active',
      requiresPasswordChange: user ? user.requiresPasswordChange ?? true : true,
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        email: user.email || "", // Email will be disabled for edit, but good to have it in form state
        role: user.role || "Member",
        password: "", // Password not pre-filled
        status: user.status || 'Active',
        requiresPasswordChange: user.requiresPasswordChange ?? true,
      });
    } else {
       form.reset({
        name: "",
        email: "",
        role: "Member",
        password: "",
        status: 'Active',
        requiresPasswordChange: true,
      });
    }
  }, [user, form]);


  const handleSubmit = async (data: UserFormSchemaValues) => {
    setIsLoading(true);
    // For new users, password is required.
    if (!user && (!data.password || data.password.length < 6)) {
        form.setError("password", { type: "manual", message: "Password is required for new users and must be at least 6 characters." });
        setIsLoading(false);
        return;
    }
    // If editing an existing user AND a new password is provided, it must be at least 6 characters.
    if (user && data.password && data.password.length > 0 && data.password.length < 6) {
        form.setError("password", { type: "manual", message: "New password must be at least 6 characters." });
        setIsLoading(false);
        return;
    }
    // If editing existing user and password field is empty, it means don't change the password.
    // The onSave handler will decide what to do with an empty password for existing user (i.e., ignore it).
    
    await onSave(data, user?.uid);
    setIsLoading(false);
    // Dialog closing and state reset is handled by parent page (admin/users/page.tsx)
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{user ? "Edit User Profile" : "Add New User"}</DialogTitle>
        <DialogDescription>
          {user ? `Update profile details for ${user.name}. Email cannot be changed.` : "Fill in the details to create a new user account and Firestore profile. This will log you (Admin) in as the new user temporarily."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="user@example.com" {...field} disabled={!!user}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Password field behavior:
              - For new users (!user): Show "Initial Password", it's required.
              - For existing users (user): Show "New Password (Optional)".
                                         If filled, attempt to change. If blank, password remains unchanged.
                                         (Note: Admin changing other user's password client-side is complex and often not done this way)
          */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{!user ? "Initial Password" : "New Password (Leave blank to keep current)"}</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
                {!user && <p className="text-xs text-muted-foreground pt-1">Minimum 6 characters.</p>}
                {user && field.value && field.value.length > 0 && <p className="text-xs text-muted-foreground pt-1">Minimum 6 characters if changing.</p>}
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {rolesArray.map((roleName) => (
                      <SelectItem key={roleName} value={roleName}>
                        {roleName} (Level {ROLES[roleName].accessLevel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="requiresPasswordChange"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                <div className="space-y-0.5">
                  <FormLabel>Require Password Change on Next Login</FormLabel>
                 </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (user ? "Saving Profile..." : "Creating User...") : (user ? "Save Changes" : "Create User & Profile")}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
