
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
import React, { useEffect, useState } from "react";
import type { StockItem, StockItemFormValues } from "@/lib/types";
import { useSettings } from "@/contexts/SettingsProvider"; // Import useSettings

const stockItemFormSchema = z.object({
  itemName: z.string().min(2, "Item name must be at least 2 characters.").max(100, "Name too long."),
  description: z.string().max(500, "Description too long.").optional(),
  unitOfMeasure: z.string().min(1, "Unit of measure is required.").max(20, "UoM too long (e.g. bags, pcs)."),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative.").optional(), // Added optional unitPrice
  initialQuantity: z.coerce.number().min(0, "Initial quantity cannot be negative.").optional(), // Only for new items
  lowStockThreshold: z.coerce.number().min(0, "Low stock threshold cannot be negative."),
});

interface StockItemFormProps {
  stockItem?: StockItem | null;
  onSave: (data: StockItemFormValues, itemId?: string) => Promise<void>;
  onCancel: () => void;
}

export default function StockItemForm({ stockItem, onSave, onCancel }: StockItemFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { settings } = useSettings(); // Get settings for currency symbol

  const form = useForm<StockItemFormValues>({
    resolver: zodResolver(stockItemFormSchema),
    defaultValues: {
      itemName: stockItem?.itemName || "",
      description: stockItem?.description || "",
      unitOfMeasure: stockItem?.unitOfMeasure || "",
      unitPrice: stockItem?.unitPrice || undefined, // Initialize as undefined if not present
      initialQuantity: stockItem ? undefined : 0, 
      lowStockThreshold: stockItem?.lowStockThreshold || 0,
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (stockItem) {
      reset({
        itemName: stockItem.itemName,
        description: stockItem.description || "",
        unitOfMeasure: stockItem.unitOfMeasure,
        unitPrice: stockItem.unitPrice || undefined,
        initialQuantity: undefined, 
        lowStockThreshold: stockItem.lowStockThreshold || 0,
      });
    } else {
      reset({
        itemName: "",
        description: "",
        unitOfMeasure: "",
        unitPrice: undefined,
        initialQuantity: 0,
        lowStockThreshold: 0,
      });
    }
  }, [stockItem, reset]);

  const handleSubmit = async (data: StockItemFormValues) => {
    setIsLoading(true);
    await onSave(data, stockItem?.id);
    setIsLoading(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{stockItem ? "Edit Stock Item" : "Add New Stock Item"}</DialogTitle>
        <DialogDescription>
          {stockItem ? `Update details for "${stockItem.itemName}".` : "Fill in the details for a new inventory item."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <FormField
            control={form.control}
            name="itemName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item Name</FormLabel>
                <FormControl><Input placeholder="e.g., Cement Bags" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl><Textarea placeholder="Details about the item..." {...field} rows={3} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unitOfMeasure"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit of Measure</FormLabel>
                <FormControl><Input placeholder="e.g., bags, kg, pcs, meters" {...field} /></FormControl>
                <FormDescription>The unit used to quantify this item.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
              control={form.control}
              name="unitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Price ({settings.currencySymbol}) (Optional)</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g., 150.00" {...field} step="any" /></FormControl>
                  <FormDescription>Reference cost per unit for this item.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

          {!stockItem && ( 
            <FormField
              control={form.control}
              name="initialQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Quantity</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g., 100" {...field} /></FormControl>
                  <FormDescription>Current stock will be set to this value.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
           <FormField
            control={form.control}
            name="lowStockThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Low Stock Threshold</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 10" {...field} /></FormControl>
                <FormDescription>A notification will be triggered if quantity falls below this.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (stockItem ? "Saving..." : "Adding...") : (stockItem ? "Save Changes" : "Add Stock Item")}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
