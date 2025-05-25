
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
import React, { useEffect, useState } from "react";
import type { StockItem, StockTransactionFormValues } from "@/lib/types";
import { useSettings } from "@/contexts/SettingsProvider";

interface StockTransactionFormProps {
  stockItem: StockItem;
  transactionType: 'IN' | 'OUT';
  onSave: (data: StockTransactionFormValues, itemId: string, currentItem: StockItem) => Promise<void>;
  onCancel: () => void;
}

export default function StockTransactionForm({ stockItem, transactionType, onSave, onCancel }: StockTransactionFormProps) {
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);

  const stockTransactionFormSchema = z.object({
    date: z.date({ required_error: "Transaction date is required." }),
    quantity: z.coerce.number().positive("Quantity must be greater than 0."),
    unitCost: z.coerce.number().min(0, "Unit cost cannot be negative.").optional(),
    supplier: z.string().max(100, "Supplier name too long.").optional(),
    issuedTo: z.string().max(100, "Recipient name too long.").optional(),
    notes: z.string().max(500, "Notes too long.").optional(),
  }).refine(data => {
    if (transactionType === 'IN' && (data.unitCost === undefined || data.unitCost < 0)) {
      return false; // Unit cost is required and must be non-negative for IN transactions
    }
    return true;
  }, {
    message: "Unit cost is required for incoming stock.",
    path: ["unitCost"], 
  });


  const form = useForm<StockTransactionFormValues>({
    resolver: zodResolver(stockTransactionFormSchema),
    defaultValues: {
      date: new Date(),
      quantity: 1,
      unitCost: transactionType === 'IN' ? 0 : undefined,
      supplier: "",
      issuedTo: "",
      notes: "",
    },
  });

  const { reset } = form;

  useEffect(() => {
    reset({
      date: new Date(),
      quantity: 1,
      unitCost: transactionType === 'IN' ? 0 : undefined,
      supplier: "",
      issuedTo: "",
      notes: "",
    });
  }, [stockItem, transactionType, reset]);

  const handleSubmit = async (data: StockTransactionFormValues) => {
    setIsLoading(true);
    await onSave(data, stockItem.id!, stockItem);
    setIsLoading(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{transactionType === 'IN' ? "Record Stock IN" : "Record Stock OUT"} for {stockItem.itemName}</DialogTitle>
        <DialogDescription>
          {transactionType === 'IN' 
            ? `Enter details for stock received for "${stockItem.itemName}". Current Qty: ${stockItem.currentQuantity}`
            : `Enter details for stock disbursed for "${stockItem.itemName}". Current Qty: ${stockItem.currentQuantity}`
          }
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Transaction Date</FormLabel>
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
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity ({stockItem.unitOfMeasure})</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 10" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {transactionType === 'IN' && (
            <>
              <FormField
                control={form.control}
                name="unitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Cost ({settings.currencySymbol})</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 150" {...field} /></FormControl>
                    <FormDescription>Cost per {stockItem.unitOfMeasure}.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., BuildMart Inc." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
          {transactionType === 'OUT' && (
            <FormField
              control={form.control}
              name="issuedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issued To / Project (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g., Site A, John Doe" {...field} /></FormControl>
                  <FormDescription>Who or which project received the stock.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl><Textarea placeholder="Any relevant notes for this transaction..." {...field} rows={2} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : (transactionType === 'IN' ? "Record Stock IN" : "Record Stock OUT")}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
