
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
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React, { useEffect, useState } from "react";
import type { Professional, ProfessionalFormValues, ProfessionalStatus } from "@/lib/types";
import { useSettings } from "@/contexts/SettingsProvider";

const professionalStatuses: ProfessionalStatus[] = ['Active', 'On Hold', 'Completed', 'Terminated'];

const professionalFormSchema = z.object({
  name: z.string().min(2, "Name is required.").max(100),
  serviceType: z.string().min(2, "Service type is required.").max(100, "Service type too long."),
  contactPhone: z.string().max(20).optional(),
  contactEmail: z.string().email("Invalid email format.").max(100).optional(),
  assignedJobDescription: z.string().max(1000, "Description is too long.").optional(),
  totalAgreedCharge: z.coerce.number().min(0, "Agreed charge must be non-negative."),
  status: z.enum(professionalStatuses),
});

interface ProfessionalFormProps {
  professional?: Professional | null;
  onSave: (data: ProfessionalFormValues, professionalId?: string) => Promise<void>;
  onCancel: () => void;
}

export default function ProfessionalForm({ professional, onSave, onCancel }: ProfessionalFormProps) {
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfessionalFormValues>({
    resolver: zodResolver(professionalFormSchema),
    defaultValues: {
      name: professional?.name || "",
      serviceType: professional?.serviceType || "",
      contactPhone: professional?.contactInfo?.phone || "",
      contactEmail: professional?.contactInfo?.email || "",
      assignedJobDescription: professional?.assignedJobDescription || "",
      totalAgreedCharge: professional?.totalAgreedCharge || 0,
      status: professional?.status || "Active",
    },
  });

  useEffect(() => {
    if (professional) {
      form.reset({
        name: professional.name,
        serviceType: professional.serviceType,
        contactPhone: professional.contactInfo?.phone || "",
        contactEmail: professional.contactInfo?.email || "",
        assignedJobDescription: professional.assignedJobDescription || "",
        totalAgreedCharge: professional.totalAgreedCharge,
        status: professional.status,
      });
    } else {
      form.reset({
        name: "",
        serviceType: "",
        contactPhone: "",
        contactEmail: "",
        assignedJobDescription: "",
        totalAgreedCharge: 0,
        status: "Active",
      });
    }
  }, [professional, form]);

  const handleSubmit = async (data: ProfessionalFormValues) => {
    setIsLoading(true);
    await onSave(data, professional?.id);
    setIsLoading(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{professional ? "Edit Professional" : "Add New Professional"}</DialogTitle>
        <DialogDescription>
          {professional ? `Update details for ${professional.name}.` : "Fill in the details for the new professional or laborer."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[75vh] overflow-y-auto pr-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name / Company Name</FormLabel>
                <FormControl><Input placeholder="e.g., John Banda, QuickFix Ltd." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Type / Trade</FormLabel>
                <FormControl><Input placeholder="e.g., Plumber, Electrician, Legal Consultant" {...field} /></FormControl>
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
                  <FormControl><Input type="email" placeholder="e.g., contact@quickfix.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="assignedJobDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned Job / Scope of Work (Optional)</FormLabel>
                <FormControl><Textarea placeholder="Describe the work or service to be provided..." {...field} rows={3} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="totalAgreedCharge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Agreed Charge ({settings.currencySymbol})</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 250000" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                <FormDescription>The total amount agreed for the service or job.</FormDescription>
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
                  <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {professionalStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (professional ? "Saving..." : "Adding...") : (professional ? "Save Changes" : "Add Professional")}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
