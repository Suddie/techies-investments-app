
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
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addMonths } from "date-fns";
import React, { useEffect, useState, useMemo } from "react"; // Added useMemo
import type { Tenant, RentInvoice, RentInvoiceFormValues } from "@/lib/types";
import { useSettings } from "@/contexts/SettingsProvider";

const rentInvoiceFormSchema = z.object({
  tenantId: z.string(), // Hidden, but required
  invoiceDate: z.date({ required_error: "Invoice date is required." }),
  dueDate: z.date({ required_error: "Due date is required." }),
  periodCoveredStart: z.date({ required_error: "Period start date is required." }),
  periodCoveredEnd: z.date({ required_error: "Period end date is required." }),
  rentAmount: z.coerce.number().min(0, "Rent amount must be non-negative."),
  arrearsBroughtForward: z.coerce.number().min(0, "Arrears must be non-negative.").optional(),
  notes: z.string().max(500, "Notes are too long.").optional(),
}).refine(data => data.dueDate >= data.invoiceDate, {
  message: "Due date cannot be before invoice date.",
  path: ["dueDate"],
}).refine(data => data.periodCoveredEnd >= data.periodCoveredStart, {
  message: "Period end date cannot be before period start date.",
  path: ["periodCoveredEnd"],
});


interface RentInvoiceFormProps {
  tenant: Tenant; // The tenant for whom the invoice is being created/edited
  invoice?: RentInvoice | null; // For editing existing invoice
  onSave: (data: RentInvoiceFormValues, invoiceId?: string) => Promise<void>;
  onCancel: () => void;
}

export default function RentInvoiceForm({ tenant, invoice, onSave, onCancel }: RentInvoiceFormProps) {
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);

  const defaultPeriodStart = useMemo(() => new Date(), []);
  const defaultPeriodEnd = useMemo(() => addMonths(defaultPeriodStart, 1), [defaultPeriodStart]);

  const form = useForm<RentInvoiceFormValues>({
    resolver: zodResolver(rentInvoiceFormSchema),
    defaultValues: {
      tenantId: tenant.id || "",
      invoiceDate: invoice?.invoiceDate ? (invoice.invoiceDate.toDate ? invoice.invoiceDate.toDate() : new Date(invoice.invoiceDate)) : new Date(),
      dueDate: invoice?.dueDate ? (invoice.dueDate.toDate ? invoice.dueDate.toDate() : new Date(invoice.dueDate)) : addMonths(new Date(), 1), // Default due in 1 month
      periodCoveredStart: invoice?.periodCoveredStart ? (invoice.periodCoveredStart.toDate ? invoice.periodCoveredStart.toDate() : new Date(invoice.periodCoveredStart)) : defaultPeriodStart,
      periodCoveredEnd: invoice?.periodCoveredEnd ? (invoice.periodCoveredEnd.toDate ? invoice.periodCoveredEnd.toDate() : new Date(invoice.periodCoveredEnd)) : defaultPeriodEnd,
      rentAmount: invoice?.rentAmount || tenant.rentAmount || 0,
      arrearsBroughtForward: invoice?.arrearsBroughtForward || tenant.arrearsBroughtForward || 0,
      notes: invoice?.notes || "",
    },
  });
  const { reset } = form; // Destructure reset

  useEffect(() => {
    reset({ // Use the destructured reset
      tenantId: tenant.id || "",
      invoiceDate: invoice?.invoiceDate ? (invoice.invoiceDate.toDate ? invoice.invoiceDate.toDate() : new Date(invoice.invoiceDate)) : new Date(),
      dueDate: invoice?.dueDate ? (invoice.dueDate.toDate ? invoice.dueDate.toDate() : new Date(invoice.dueDate)) : addMonths(new Date(), 1),
      periodCoveredStart: invoice?.periodCoveredStart ? (invoice.periodCoveredStart.toDate ? invoice.periodCoveredStart.toDate() : new Date(invoice.periodCoveredStart)) : defaultPeriodStart,
      periodCoveredEnd: invoice?.periodCoveredEnd ? (invoice.periodCoveredEnd.toDate ? invoice.periodCoveredEnd.toDate() : new Date(invoice.periodCoveredEnd)) : defaultPeriodEnd,
      rentAmount: invoice?.rentAmount || tenant.rentAmount || 0,
      arrearsBroughtForward: invoice?.arrearsBroughtForward || tenant.arrearsBroughtForward || 0,
      notes: invoice?.notes || "",
    });
  }, [tenant, invoice, reset, defaultPeriodStart, defaultPeriodEnd]); // Use reset in dependency array

  const watchedRentAmount = form.watch("rentAmount");
  const watchedArrears = form.watch("arrearsBroughtForward");
  const totalDue = (watchedRentAmount || 0) + (watchedArrears || 0);

  const handleSubmit = async (data: RentInvoiceFormValues) => {
    setIsLoading(true);
    await onSave(data, invoice?.id);
    setIsLoading(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{invoice ? `Edit Invoice ${invoice.invoiceNumber}` : `Create Rent Invoice for ${tenant.name}`}</DialogTitle>
        <DialogDescription>
          {invoice ? `Update details for this invoice.` : `Unit: ${tenant.unitNumber}. Rent: ${settings.currencySymbol}${tenant.rentAmount}/${tenant.paymentFrequency}.`}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[75vh] overflow-y-auto pr-2">
          {/* tenantId is hidden but part of form state */}
          <FormField control={form.control} name="tenantId" render={({ field }) => <Input type="hidden" {...field} />} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="invoiceDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Invoice Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild><FormControl>
                      <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                  </Popover><FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild><FormControl>
                      <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                  </Popover><FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="periodCoveredStart"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Period Covered - Start</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild><FormControl>
                      <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                  </Popover><FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="periodCoveredEnd"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Period Covered - End</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild><FormControl>
                      <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                  </Popover><FormMessage />
                </FormItem>
              )}
            />
          </div>
          
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
              name="arrearsBroughtForward"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arrears B/F ({settings.currencySymbol}) (Optional)</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g., 50000" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                  <FormDescription>Outstanding amount from previous periods.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

           <div className="p-3 border rounded-md bg-muted/50">
                <div className="flex justify-between text-sm font-semibold">
                    <span>Total Due:</span>
                    <span>{settings.currencySymbol} {totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
           </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl><Textarea placeholder="Any additional notes for this invoice..." {...field} rows={2} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (invoice ? "Saving..." : "Creating...") : (invoice ? "Save Changes" : "Create Invoice")}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
