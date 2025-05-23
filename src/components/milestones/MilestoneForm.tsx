
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
import type { Milestone, MilestoneFormValues, MilestoneStatus } from "@/lib/types";
import { useSettings } from "@/contexts/SettingsProvider";

const milestoneStatuses: MilestoneStatus[] = ['Not Started', 'In Progress', 'Completed', 'On Hold', 'Cancelled'];

const milestoneFormSchema = z.object({
  name: z.string().min(3, "Milestone name must be at least 3 characters.").max(100, "Name too long."),
  description: z.string().max(500, "Description too long.").optional(),
  targetAmount: z.coerce.number().min(0, "Target amount cannot be negative."),
  targetDate: z.date().optional(),
  status: z.enum(milestoneStatuses),
  actualCompletionDate: z.date().optional(),
}).refine(data => {
    if (data.actualCompletionDate && data.targetDate && data.actualCompletionDate < data.targetDate) {
        // This validation might be too strict if target dates are estimates
        // For now, let's allow completion date to be before target date
    }
    if (data.status !== 'Completed' && data.actualCompletionDate) {
        // If status is not 'Completed', actualCompletionDate should ideally not be set or should be cleared.
        // We can handle this in the submit logic or leave it for admin to manage.
    }
    return true;
});


interface MilestoneFormProps {
  milestone?: Milestone | null;
  onSave: (data: MilestoneFormValues, milestoneId?: string) => Promise<void>;
  onCancel: () => void;
}

export default function MilestoneForm({ milestone, onSave, onCancel }: MilestoneFormProps) {
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: {
      name: milestone?.name || "",
      description: milestone?.description || "",
      targetAmount: milestone?.targetAmount || 0,
      targetDate: milestone?.targetDate ? new Date(milestone.targetDate.seconds ? milestone.targetDate.toDate() : milestone.targetDate) : undefined,
      status: milestone?.status || "Not Started",
      actualCompletionDate: milestone?.actualCompletionDate ? new Date(milestone.actualCompletionDate.seconds ? milestone.actualCompletionDate.toDate() : milestone.actualCompletionDate) : undefined,
    },
  });

  const statusWatch = form.watch("status");

  useEffect(() => {
    if (milestone) {
      form.reset({
        name: milestone.name,
        description: milestone.description || "",
        targetAmount: milestone.targetAmount,
        targetDate: milestone.targetDate ? new Date(milestone.targetDate.seconds ? milestone.targetDate.toDate() : milestone.targetDate) : undefined,
        status: milestone.status,
        actualCompletionDate: milestone.actualCompletionDate ? new Date(milestone.actualCompletionDate.seconds ? milestone.actualCompletionDate.toDate() : milestone.actualCompletionDate) : undefined,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        targetAmount: 0,
        targetDate: undefined,
        status: "Not Started",
        actualCompletionDate: undefined,
      });
    }
  }, [milestone, form]);

  const handleSubmit = async (data: MilestoneFormValues) => {
    setIsLoading(true);
    // If status is not 'Completed', clear actualCompletionDate
    const finalData = { ...data };
    if (data.status !== 'Completed') {
      finalData.actualCompletionDate = undefined;
    }
    await onSave(finalData, milestone?.id);
    setIsLoading(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{milestone ? "Edit Milestone" : "Add New Milestone"}</DialogTitle>
        <DialogDescription>
          {milestone ? `Update details for "${milestone.name}".` : "Fill in the details for a new project milestone."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Milestone Name</FormLabel>
                <FormControl><Input placeholder="e.g., Foundation Pouring" {...field} /></FormControl>
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
                <FormControl><Textarea placeholder="Details about this milestone..." {...field} rows={3} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="targetAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Amount ({settings.currencySymbol})</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 5000000" {...field} /></FormControl>
                <FormDescription>Estimated cost or financial target for this milestone.</FormDescription>
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
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {milestoneStatuses.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="targetDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Target Date (Optional)</FormLabel>
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
          {statusWatch === 'Completed' && (
            <FormField
              control={form.control}
              name="actualCompletionDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Actual Completion Date (Optional)</FormLabel>
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
                  <FormDescription>Date the milestone was actually completed.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (milestone ? "Saving..." : "Adding...") : (milestone ? "Save Changes" : "Add Milestone")}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
