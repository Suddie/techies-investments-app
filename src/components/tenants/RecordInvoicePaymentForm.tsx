
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
import type { RentInvoice, RecordInvoicePaymentFormValues, InvoicePaymentMethod } from "@/lib/types";
import { useSettings } from "@/contexts/SettingsProvider";

const paymentMethods: InvoicePaymentMethod[] = ['Cash', 'Bank Transfer', 'Cheque', 'Mobile Money', 'Other'];

const recordPaymentFormSchema = z.object({
  amountPaid: z.coerce.number().positive("Amount paid must be a positive number."),
  datePaid: z.date({ required_error: "Payment date is required." }),
  paymentMethod: z.enum(paymentMethods, { required_error: "Payment method is required." }),
  notes: z.string().max(250, "Notes are too long.").optional(),
});

interface RecordInvoicePaymentFormProps {
  invoice: RentInvoice;
  onSave: (data: RecordInvoicePaymentFormValues, invoiceId: string) => Promise<void>;
  onCancel: () => void;
}

export default function RecordInvoicePaymentForm({ invoice, onSave, onCancel }: RecordInvoicePaymentFormProps) {
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const balanceDue = invoice.totalDue - invoice.amountPaid;

  const form = useForm<RecordInvoicePaymentFormValues>({
    resolver: zodResolver(recordPaymentFormSchema),
    defaultValues: {
      amountPaid: balanceDue > 0 ? balanceDue : 0,
      datePaid: new Date(),
      paymentMethod: 'Bank Transfer',
      notes: "",
    },
  });

  useEffect(() => {
    form.reset({
      amountPaid: balanceDue > 0 ? balanceDue : 0,
      datePaid: new Date(),
      paymentMethod: invoice.paymentMethod || 'Bank Transfer',
      notes: "",
    });
  }, [invoice, form, balanceDue]);

  const handleSubmit = async (data: RecordInvoicePaymentFormValues) => {
    if (data.amountPaid <= 0) {
        form.setError("amountPaid", { message: "Amount paid must be greater than zero."});
        return;
    }
    // We could add a check here if data.amountPaid > balanceDue if we strictly don't allow overpayments
    // For now, we'll allow it and the status update logic will handle it.
    setIsLoading(true);
    await onSave(data, invoice.id!);
    setIsLoading(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Record Payment for Invoice #{invoice.invoiceNumber}</DialogTitle>
        <DialogDescription>
          Tenant: {invoice.tenantName} (Unit {invoice.unitNumber}). <br />
          Invoice Total: {settings.currencySymbol}{invoice.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}. 
          Currently Paid: {settings.currencySymbol}{invoice.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}. <br />
          <span className="font-semibold">Balance Due: {settings.currencySymbol}{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <FormField
            control={form.control}
            name="amountPaid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount Being Paid ({settings.currencySymbol})</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="e.g., 150000" 
                    {...field} 
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                    step="any"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="datePaid"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of Payment</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {paymentMethods.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Notes (Optional)</FormLabel>
                <FormControl><Textarea placeholder="e.g., Paid via EFT, Ref #123" {...field} rows={2} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving Payment..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
