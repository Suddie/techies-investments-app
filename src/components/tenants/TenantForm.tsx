
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import React, { useEffect, useState } from "react";
import type { Tenant, TenantFormValues, TenantStatus, PaymentFrequency } from "@/lib/types";
import { useSettings } from "@/contexts/SettingsProvider";

const tenantStatuses: TenantStatus[] = ['Active', 'Inactive', 'Pending'];
const paymentFrequencies: PaymentFrequency[] = ['Monthly', 'Quarterly', 'Annually', 'Bi-Annually'];

const tenantFormSchema = z.object({
  name: z.string().min(2, "Tenant name is required.").max(100),
  unitNumber: z.string().min(1, "Unit number is required.").max(50),
  contactPhone: z.string().max(20).optional(),
  contactEmail: z.string().email("Invalid email format.").max(100).optional(),
  contactAddress: z.string().max(200).optional(),
  rentAmount: z.coerce.number().min(0, "Rent amount must be non-negative."),
  paymentFrequency: z.enum(paymentFrequencies),
  leaseStartDate: z.date().optional(),
  leaseEndDate: z.date().optional(),
  status: z.enum(tenantStatuses),
  arrearsBroughtForward: z.coerce.number().min(0, "Arrears must be non-negative.").optional(),
  notes: z.string().max(500, "Notes are too long.").optional(),
}).refine(data => {
  if (data.leaseStartDate && data.leaseEndDate && data.leaseEndDate < data.leaseStartDate) {
    return false;
  }
  return true;
}, {
  message: "Lease end date cannot be before lease start date.",
  path: ["leaseEndDate"],
});

interface TenantFormProps {
  tenant?: Tenant | null;
  onSave: (data: TenantFormValues, tenantId?: string) => Promise<void>;
  onCancel: () => void;
}

export default function TenantForm({ tenant, onSave, onCancel }: TenantFormProps) {
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: tenant?.name || "",
      unitNumber: tenant?.unitNumber || "",
      contactPhone: tenant?.contactInfo?.phone || "",
      contactEmail: tenant?.contactInfo?.email || "",
      contactAddress: tenant?.contactInfo?.address || "",
      rentAmount: tenant?.rentAmount || 0,
      paymentFrequency: tenant?.paymentFrequency || "Monthly",
      leaseStartDate: tenant?.leaseStartDate ? (tenant.leaseStartDate.toDate ? tenant.leaseStartDate.toDate() : new Date(tenant.leaseStartDate)) : undefined,
      leaseEndDate: tenant?.leaseEndDate ? (tenant.leaseEndDate.toDate ? tenant.leaseEndDate.toDate() : new Date(tenant.leaseEndDate)) : undefined,
      status: tenant?.status || "Active",
      arrearsBroughtForward: tenant?.arrearsBroughtForward || 0,
      notes: tenant?.notes || "",
    },
  });

  useEffect(() => {
    if (tenant) {
      form.reset({
        name: tenant.name,
        unitNumber: tenant.unitNumber,
        contactPhone: tenant.contactInfo?.phone || "",
        contactEmail: tenant.contactInfo?.email || "",
        contactAddress: tenant.contactInfo?.address || "",
        rentAmount: tenant.rentAmount,
        paymentFrequency: tenant.paymentFrequency,
        leaseStartDate: tenant.leaseStartDate ? (tenant.leaseStartDate.toDate ? tenant.leaseStartDate.toDate() : new Date(tenant.leaseStartDate)) : undefined,
        leaseEndDate: tenant.leaseEndDate ? (tenant.leaseEndDate.toDate ? tenant.leaseEndDate.toDate() : new Date(tenant.leaseEndDate)) : undefined,
        status: tenant.status,
        arrearsBroughtForward: tenant.arrearsBroughtForward || 0,
        notes: tenant.notes || "",
      });
    } else {
      form.reset({
        name: "",
        unitNumber: "",
        contactPhone: "",
        contactEmail: "",
        contactAddress: "",
        rentAmount: 0,
        paymentFrequency: "Monthly",
        leaseStartDate: undefined,
        leaseEndDate: undefined,
        status: "Active",
        arrearsBroughtForward: 0,
        notes: "",
      });
    }
  }, [tenant, form]);

  const handleSubmit = async (data: TenantFormValues) => {
    setIsLoading(true);
    await onSave(data, tenant?.id);
    setIsLoading(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{tenant ? "Edit Tenant Information" : "Add New Tenant"}</DialogTitle>
        <DialogDescription>
          {tenant ? `Update details for ${tenant.name} in Unit ${tenant.unitNumber}.` : "Fill in the details for the new tenant."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[75vh] overflow-y-auto pr-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tenant Full Name</FormLabel>
                <FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unitNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit / Apartment Number</FormLabel>
                <FormControl><Input placeholder="e.g., A101, Unit 5B" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone (Optional)</FormLabel>
                  <FormControl><Input type="tel" placeholder="e.g., +265 999 123 456" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email (Optional)</FormLabel>
                  <FormControl><Input type="email" placeholder="e.g., tenant@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="contactAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Address (Optional)</FormLabel>
                <FormControl><Textarea placeholder="Tenant's postal or physical address" {...field} rows={2} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="rentAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rent Amount ({settings.currencySymbol})</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g., 150000" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Frequency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {paymentFrequencies.map(freq => <SelectItem key={freq} value={freq}>{freq}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="leaseStartDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Lease Start Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="leaseEndDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Lease End Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {tenantStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="arrearsBroughtForward"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arrears B/F ({settings.currencySymbol}) (Optional)</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g., 50000" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                  <FormDescription>Initial outstanding amount, if any.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl><Textarea placeholder="Any additional notes about this tenant or lease..." {...field} rows={3} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (tenant ? "Saving..." : "Adding...") : (tenant ? "Save Changes" : "Add Tenant")}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
