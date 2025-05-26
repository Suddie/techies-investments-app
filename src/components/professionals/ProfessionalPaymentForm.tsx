
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
import { format } from "date-fns";
import React, { useState } from "react";
import type { Professional, ProfessionalPaymentFormValues } from "@/lib/types";
import { useSettings } from "@/contexts/SettingsProvider";

const paymentFormSchema = z.object({
  date: z.date({ required_error: "Payment date is required." }),
  amountPaid: z.coerce.number().positive("Amount paid must be greater than 0."),
  notes: z.string().max(250, "Notes are too long.").optional(),
});

interface ProfessionalPaymentFormProps {
  professional: Professional;
  onSave: (data: ProfessionalPaymentFormValues) => Promise<void>;
  onCancel: () => void;
}

export default function ProfessionalPaymentForm({ professional, onSave, onCancel }: ProfessionalPaymentFormProps) {
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfessionalPaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      date: new Date(),
      amountPaid: 0,
      notes: "",
    },
  });

  const handleSubmit = async (data: ProfessionalPaymentFormValues) => {
    setIsLoading(true);
    await onSave(data);
    setIsLoading(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Record Payment for {professional.name}</DialogTitle>
        <DialogDescription>
          Current Balance Due: {settings.currencySymbol} {professional.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Payment Date</FormLabel>
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
            name="amountPaid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount Paid ({settings.currencySymbol})</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="e.g., 50000" 
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
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., Part payment, invoice #123" {...field} rows={2} />
                </FormControl>
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
