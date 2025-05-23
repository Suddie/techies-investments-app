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
import type { UserProfile, UserRole } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"; // Assuming used in a dialog
import React, { useEffect, useState } from "react";

const rolesArray = Object.keys(ROLES) as UserRole[];

const userFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  role: z.enum(rolesArray),
  password: z.string().optional(), // Optional: only for new users or if resetting
  status: z.enum(['Active', 'Inactive']),
  requiresPasswordChange: z.boolean().default(true),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  user?: UserProfile | null; // For editing existing user
  onSave: (data: UserFormValues, userId?: string) => Promise<void>;
  onCancel: () => void;
}

export default function UserForm({ user, onSave, onCancel }: UserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      role: user?.role || "Member",
      password: "",
      status: user?.status || 'Active',
      requiresPasswordChange: user ? user.requiresPasswordChange ?? true : true,
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        email: user.email || "",
        role: user.role || "Member",
        password: "", // Password not pre-filled for editing
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


  const handleSubmit = async (data: UserFormValues) => {
    setIsLoading(true);
    // For new users, password is required. Add custom validation if needed or adjust schema.
    if (!user && !data.password) {
        form.setError("password", { type: "manual", message: "Password is required for new users." });
        setIsLoading(false);
        return;
    }
    if (user && data.password && data.password.length < 6) {
        form.setError("password", { type: "manual", message: "New password must be at least 6 characters." });
        setIsLoading(false);
        return;
    }
    await onSave(data, user?.uid);
    setIsLoading(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{user ? "Edit User" : "Add New User"}</DialogTitle>
        <DialogDescription>
          {user ? `Update details for ${user.name}.` : "Fill in the details to create a new user account."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
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
          {!user && ( // Only show password field for new users or explicitly for reset
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {user && ( // Option to set new password for existing user
             <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password (Optional)</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Leave blank to keep current" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
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
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
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
              {isLoading ? (user ? "Saving..." : "Creating...") : (user ? "Save Changes" : "Create User")}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
