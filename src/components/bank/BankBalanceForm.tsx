
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import React, { useEffect, useState, useMemo } from "react";
import type { BankBalance, BankBalanceFormValues } from "@/lib/types";
import { useSettings } from "@/contexts/SettingsProvider";
import { format, addMonths, subMonths, getYear, getMonth } from "date-fns";

const generateMonthYearOptions = () => {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  // Generate for current year, 1 year past, and 1 year future
  for (let i = -1; i <= 1; i++) {
    const year = getYear(today) + i;
    for (let j = 0; j < 12; j++) {
      const monthDate = new Date(year, j, 1);
      options.push({
        value: format(monthDate, "yyyy-MM"),
        label: format(monthDate, "MMMM yyyy"),
      });
    }
  }
  // Sort chronologically, most recent first for selection convenience
  return options.sort((a, b) => b.value.localeCompare(a.value)); 
};

const bankBalanceFormSchema = z.object({
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, "Month/Year format must be YYYY-MM."),
  openingBalance: z.coerce.number().min(0, "Opening balance cannot be negative."),
  closingBalance: z.coerce.number().min(0, "Closing balance cannot be negative."),
  interestEarned: z.coerce.number().min(0, "Interest earned cannot be negative.").optional(),
  bankCharges: z.coerce.number().min(0, "Bank charges cannot be negative.").optional(),
});


interface BankBalanceFormProps {
  balance?: BankBalance | null;
  onSave: (data: BankBalanceFormValues, balanceId?: string) => Promise<void>;
  onCancel: () => void;
}

export default function BankBalanceForm({ balance, onSave, onCancel }: BankBalanceFormProps) {
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const monthYearOptions = useMemo(() => generateMonthYearOptions(), []);

  const form = useForm<BankBalanceFormValues>({
    resolver: zodResolver(bankBalanceFormSchema),
    defaultValues: {
      monthYear: balance?.monthYear || format(new Date(), "yyyy-MM"),
      openingBalance: balance?.openingBalance || 0,
      closingBalance: balance?.closingBalance || 0,
      interestEarned: balance?.interestEarned ?? undefined,
      bankCharges: balance?.bankCharges ?? undefined,
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (balance) {
      reset({
        monthYear: balance.monthYear,
        openingBalance: balance.openingBalance,
        closingBalance: balance.closingBalance,
        interestEarned: balance.interestEarned ?? undefined,
        bankCharges: balance.bankCharges ?? undefined,
      });
    } else {
      reset({
        monthYear: format(new Date(), "yyyy-MM"),
        openingBalance: 0,
        closingBalance: 0,
        interestEarned: undefined,
        bankCharges: undefined,
      });
    }
  }, [balance, reset]);

  const handleSubmit = async (data: BankBalanceFormValues) => {
    setIsLoading(true);
    await onSave(data, balance?.id);
    setIsLoading(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{balance ? "Edit Bank Balance" : "Add New Bank Balance Entry"}</DialogTitle>
        <DialogDescription>
          {balance ? `Update entry for ${format(new Date(balance.monthYear + '-02'), "MMMM yyyy")}.` : "Record a new monthly bank balance summary."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <FormField
            control={form.control}
            name="monthYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Month / Year</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!balance}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select month and year" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {monthYearOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Select the month this balance entry is for. Cannot be changed after creation.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="openingBalance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opening Balance ({settings.currencySymbol})</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 1000000" {...field} step="any" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="closingBalance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Closing Balance ({settings.currencySymbol})</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 1200000" {...field} step="any" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="interestEarned"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interest Earned ({settings.currencySymbol}) (Optional)</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 5000" {...field} step="any" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bankCharges"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bank Charges ({settings.currencySymbol}) (Optional)</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 200" {...field} step="any" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (balance ? "Saving..." : "Adding...") : (balance ? "Save Changes" : "Add Entry")}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
