
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { UserProfile, UserRole, UserFormValues as UserFormSchemaValues } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription as DialogDesc } from "@/components/ui/dialog"; 
import React, { useEffect, useState } from "react";
import { useSettings } from "@/contexts/SettingsProvider"; // Added for currency symbol

const rolesArray = Object.keys(ROLES) as UserRole[];

const userFormZodSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  role: z.enum(rolesArray),
  password: z.string().optional(),
  status: z.enum(['Active', 'Inactive']),
  requiresPasswordChange: z.boolean().default(true),
  tpin: z.string().max(20, "TPIN is too long.").optional().or(z.literal('')), 
});


interface UserFormProps {
  user?: UserProfile | null; 
  onSave: (data: UserFormSchemaValues, userId?: string) => Promise<void>;
  onCancel: () => void;
}

export default function UserForm({ user, onSave, onCancel }: UserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { settings } = useSettings(); // Get settings for currency
  
  const form = useForm<UserFormSchemaValues>({ 
    resolver: zodResolver(userFormZodSchema), 
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      role: user?.role || "Member",
      password: "", 
      status: user?.status || 'Active',
      requiresPasswordChange: user ? user.requiresPasswordChange ?? true : true,
      tpin: user?.tpin || "", 
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        email: user.email || "", 
        role: user.role || "Member",
        password: "", 
        status: user.status || 'Active',
        requiresPasswordChange: user.requiresPasswordChange ?? true,
        tpin: user.tpin || "", 
      });
    } else {
       form.reset({
        name: "",
        email: "",
        role: "Member",
        password: "",
        status: 'Active',
        requiresPasswordChange: true,
        tpin: "", 
      });
    }
  }, [user, form]);


  const handleSubmit = async (data: UserFormSchemaValues) => {
    setIsLoading(true);
    if (!user && (!data.password || data.password.length < 6)) {
        form.setError("password", { type: "manual", message: "Password is required for new users and must be at least 6 characters." });
        setIsLoading(false);
        return;
    }
    if (user && data.password && data.password.length > 0 && data.password.length < 6) {
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
        <DialogTitle>{user ? "Edit User Profile" : "Add New User"}</DialogTitle>
        <DialogDesc>
          {user ? `Update profile details for ${user.name}. Email cannot be changed.` : "Fill in the details to create a new user account and Firestore profile. This will log you (Admin) in as the new user temporarily."}
        </DialogDesc>
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
            name="tpin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax Payer Identification Number (TPIN)</FormLabel>
                <FormControl>
                  <Input placeholder="Enter member's TPIN (optional)" {...field} />
                </FormControl>
                <FormDescription>Required for tax summary reports.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {user && user.penaltyBalance !== undefined && user.penaltyBalance > 0 && (
            <FormItem>
              <FormLabel>Outstanding Penalty Balance</FormLabel>
              <Input 
                type="text" 
                value={`${settings.currencySymbol} ${user.penaltyBalance.toLocaleString()}`} 
                readOnly 
                className="bg-muted text-muted-foreground"
              />
              <FormDescription>This user has an outstanding penalty balance.</FormDescription>
            </FormItem>
          )}

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
