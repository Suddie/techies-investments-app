
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import type { Expense } from "@/lib/types";
import { useAuth } from "@/contexts/AuthProvider";
import { useSettings } from "@/contexts/SettingsProvider";

const expenseFormSchema = z.object({
  date: z.date({ required_error: "Expense date is required." }),
  description: z.string().min(3, "Description must be at least 3 characters.").max(200, "Description too long."),
  category: z.string().min(2, "Category is required.").max(50, "Category too long."),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0."),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
  vendor: z.string().max(100, "Vendor name too long.").optional(),
  receiptUrl: z.string().url("Must be a valid URL.").optional().or(z.literal("")),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  expense?: Expense | null; // For editing existing expense
  onSave: (data: ExpenseFormValues, subtotal: number, totalAmount: number, expenseId?: string) => Promise<void>;
  onCancel: () => void;
}

export default function ExpenseForm({ expense, onSave, onCancel }: ExpenseFormProps) {
  const { userProfile } = useAuth();
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      date: expense?.date ? new Date(expense.date) : new Date(),
      description: expense?.description || "",
      category: expense?.category || "",
      quantity: expense?.quantity || 1,
      unitPrice: expense?.unitPrice || 0,
      vendor: expense?.vendor || "",
      receiptUrl: expense?.receiptUrl || "",
    },
  });

  const quantity = form.watch("quantity");
  const unitPrice = form.watch("unitPrice");

  const [subtotal, setSubtotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    const currentSubtotal = (quantity || 0) * (unitPrice || 0);
    setSubtotal(currentSubtotal);
    // For now, totalAmount is the same as subtotal. Can be extended for taxes/discounts.
    setTotalAmount(currentSubtotal);
  }, [quantity, unitPrice]);

  useEffect(() => {
    if (expense) {
      form.reset({
        date: new Date(expense.date),
        description: expense.description,
        category: expense.category,
        quantity: expense.quantity,
        unitPrice: expense.unitPrice,
        vendor: expense.vendor || "",
        receiptUrl: expense.receiptUrl || "",
      });
    } else {
      form.reset({
        date: new Date(),
        description: "",
        category: "",
        quantity: 1,
        unitPrice: 0,
        vendor: "",
        receiptUrl: "",
      });
    }
  }, [expense, form]);

  const handleSubmit = async (data: ExpenseFormValues) => {
    if (!userProfile) {
      form.setError("root", { message: "User not authenticated."});
      return;
    }
    setIsLoading(true);
    await onSave(data, subtotal, totalAmount, expense?.id);
    setIsLoading(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{expense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
        <DialogDescription>
          {expense ? "Update the details for this expense." : "Fill in the details to record a new expense."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of Expense</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
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
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
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
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., Stationery for office" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Office Supplies, Utilities" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 2" {...field} step="any" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Price ({settings.currencySymbol})</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 1500" {...field} step="any"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-1 rounded-md bg-muted/50 p-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{settings.currencySymbol} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Total Amount:</span>
              <span>{settings.currencySymbol} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>


          <FormField
            control={form.control}
            name="vendor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Shoprite" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="receiptUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Receipt URL (Optional)</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://example.com/receipt.jpg" {...field} />
                </FormControl>
                <FormDescription>Link to the uploaded receipt image/PDF.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.formState.errors.root && <FormMessage>{form.formState.errors.root.message}</FormMessage>}


          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !userProfile}>
              {isLoading ? (expense ? "Saving..." : "Adding...") : (expense ? "Save Changes" : "Add Expense")}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
