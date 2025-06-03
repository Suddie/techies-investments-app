
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, CalendarIcon, Info } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format, addMonths, subMonths, getYear, getMonth } from "date-fns";
import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { useSettings } from "@/contexts/SettingsProvider";
import { useFirebase } from "@/contexts/FirebaseProvider";
import { collection, addDoc, serverTimestamp, Timestamp, doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription as DialogDesc } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import type { Contribution, ContributionFormValues as OriginalContributionFormValues } from "@/lib/types";

const generateMonthOptions = () => {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  const startDate = subMonths(new Date(getYear(today), getMonth(today), 1), 12); 
  const endDate = addMonths(new Date(getYear(today), getMonth(today), 1), 12); 

  let currentDate = startDate;
  while (currentDate <= endDate) {
    options.push({
      value: format(currentDate, "yyyy-MM"),
      label: format(currentDate, "MMMM yyyy"),
    });
    currentDate = addMonths(currentDate, 1);
  }
  return options.sort((a, b) => a.value.localeCompare(b.value)); 
};

// Use a specific type for this form's values
type ContributionFormValues = OriginalContributionFormValues & { datePaid?: Date };


interface ContributionFormProps {
  contributionToEdit?: Contribution | null;
  isAdminEditMode?: boolean;
  onSaveAdminEdit?: (data: ContributionFormValues, contributionId: string) => Promise<void>;
  onCancelAdminEdit?: () => void;
}


export default function ContributionForm({ contributionToEdit, isAdminEditMode = false, onSaveAdminEdit, onCancelAdminEdit }: ContributionFormProps) {
  const { userProfile } = useAuth();
  const { settings } = useSettings();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const monthOptions = useMemo(() => generateMonthOptions(), []);
  
  const formSchema = z.object({
    amount: z.coerce.number()
      .min(isAdminEditMode ? 0 : (settings.contributionMin || 1), `Minimum contribution is ${settings.currencySymbol}${settings.contributionMin || 1}`) // Admin can edit to any amount
      .max(isAdminEditMode ? Infinity : (settings.contributionMax && settings.contributionMax > 0 ? settings.contributionMax : Infinity), `Maximum contribution is ${settings.currencySymbol}${settings.contributionMax || 'Unlimited'}`),
    monthsCovered: z.array(z.string()).min(1, "Please select at least one month."),
    penaltyPaidAmount: z.coerce.number().min(0, "Penalty payment cannot be negative.").optional(),
    notes: z.string().max(500, "Notes are too long.").optional(),
    datePaid: isAdminEditMode ? z.date({ required_error: "Payment date is required for admin edits." }) : z.date().optional(),
  });

  const defaultDatePaid = useMemo(() => {
    if (contributionToEdit?.datePaid) {
      return contributionToEdit.datePaid instanceof Timestamp 
        ? contributionToEdit.datePaid.toDate() 
        : new Date(contributionToEdit.datePaid);
    }
    return new Date();
  }, [contributionToEdit]);


  const form = useForm<ContributionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: contributionToEdit?.amount ?? (isAdminEditMode ? 0 : (settings.contributionMin || 0)),
      monthsCovered: contributionToEdit?.monthsCovered || [],
      penaltyPaidAmount: contributionToEdit?.penaltyPaidAmount || 0,
      notes: contributionToEdit?.notes || "",
      datePaid: defaultDatePaid,
    },
  });
  
  useEffect(() => {
    if (isAdminEditMode && contributionToEdit) {
      form.reset({
        amount: contributionToEdit.amount,
        monthsCovered: contributionToEdit.monthsCovered,
        penaltyPaidAmount: contributionToEdit.penaltyPaidAmount || 0,
        notes: contributionToEdit.notes || "",
        datePaid: contributionToEdit.datePaid instanceof Timestamp ? contributionToEdit.datePaid.toDate() : new Date(contributionToEdit.datePaid),
      });
    } else if (!isAdminEditMode) {
      form.reset({
        amount: settings.contributionMin || 0,
        monthsCovered: [],
        penaltyPaidAmount: 0,
        notes: "",
        datePaid: undefined, // Not used by user self-submission form
      });
    }
  }, [settings.contributionMin, form.reset, contributionToEdit, isAdminEditMode, form]);


  async function onSubmit(values: ContributionFormValues) {
    setLoading(true);
    if (isAdminEditMode && contributionToEdit && onSaveAdminEdit) {
      await onSaveAdminEdit(values, contributionToEdit.id!);
    } else {
      if (!userProfile) {
        toast({ title: "Authentication Error", description: "You must be logged in to make a contribution.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (userProfile.accessLevel > 3) {
          toast({ title: "Permission Denied", description: "You do not have permission to make contributions.", variant: "destructive" });
          setLoading(false);
          return;
      }
      const outstandingPenalty = userProfile.penaltyBalance || 0;
      if (values.penaltyPaidAmount && values.penaltyPaidAmount > outstandingPenalty) {
          form.setError("penaltyPaidAmount", { message: `Cannot pay more than outstanding penalty of ${settings.currencySymbol}${outstandingPenalty.toLocaleString()}.`});
          setLoading(false);
          return;
      }
      try {
        const contributionData = {
          userId: userProfile.uid,
          memberName: userProfile.name,
          amount: values.amount,
          penaltyPaidAmount: values.penaltyPaidAmount || 0,
          monthsCovered: values.monthsCovered.sort(), 
          datePaid: serverTimestamp(), // User submission uses server timestamp
          isLate: false, 
          notes: values.notes || "",
          createdAt: serverTimestamp(),
        };
        await addDoc(collection(db, "contributions"), contributionData);
        toast({
          title: "Contribution Submitted Successfully!",
          description: `Your contribution of ${settings.currencySymbol}${values.amount.toLocaleString()} ${values.penaltyPaidAmount && values.penaltyPaidAmount > 0 ? `(and ${settings.currencySymbol}${values.penaltyPaidAmount.toLocaleString()} for penalties) ` : ''}for ${values.monthsCovered.join(', ')} has been recorded.`,
          duration: 7000,
        });
        form.reset({ 
          amount: settings.contributionMin || 0, 
          monthsCovered: [], 
          penaltyPaidAmount: 0,
          notes: "" 
        });
      } catch (error: any) {
        console.error("Error submitting contribution:", error);
        toast({
          title: "Contribution Submission Failed",
          description: error.message || "Could not submit contribution. Please try again.",
          variant: "destructive",
        });
      }
    }
    setLoading(false);
  }

  const FormWrapper = isAdminEditMode ? React.Fragment : Card;
  const formWrapperProps = isAdminEditMode ? {} : { className: "w-full max-w-2xl mx-auto shadow-lg" };

  const formContent = (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {isAdminEditMode && contributionToEdit && (
            <div className="p-3 rounded-md border bg-muted/50 text-sm">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Info className="h-5 w-5 text-blue-500" /> Editing Contribution for: {contributionToEdit.memberName}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Original Record ID: {contributionToEdit.id}</p>
                <p className="text-xs text-muted-foreground">Original User ID: {contributionToEdit.userId}</p>
            </div>
        )}
        {isAdminEditMode && (
            <FormField
            control={form.control}
            name="datePaid"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Date Paid (Editable by Admin)</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={"outline"}
                        className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}
                        >
                        {field.value ? format(field.value, "PPP p") : <span>Pick a date and time</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    {/* Time selection could be added here if needed */}
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
            />
        )}

        <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Contribution Amount ({settings.currencySymbol})</FormLabel>
                <FormControl>
                <Input type="number" placeholder={`e.g. ${isAdminEditMode ? 0 : (settings.contributionMin || 1000)}`} {...field} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />

        <FormField
            control={form.control}
            name="monthsCovered"
            render={({ field }) => (
            <FormItem className="flex flex-col">
                <FormLabel>Months Covered</FormLabel>
                <Popover>
                <PopoverTrigger asChild>
                    <FormControl>
                    <Button
                        variant="outline"
                        role="combobox"
                        className={cn("w-full justify-between min-h-[2.5rem]", !field.value?.length && "text-muted-foreground")}
                    >
                        {field.value?.length
                        ? field.value.map(val => monthOptions.find(opt => opt.value === val)?.label).join(", ")
                        : "Select months..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[300px] p-0">
                    <Command>
                    <CommandInput placeholder="Search months..." />
                    <CommandList>
                        <CommandEmpty>No months found.</CommandEmpty>
                        <CommandGroup>
                        {monthOptions.map((option) => (
                            <CommandItem
                                key={option.value}
                                value={option.label} 
                                onSelect={() => {
                                    const currentValue = field.value || [];
                                    const newValue = currentValue.includes(option.value)
                                    ? currentValue.filter((v) => v !== option.value)
                                    : [...currentValue, option.value];
                                    field.onChange(newValue.sort()); 
                                }}
                            >
                            <Check
                                className={cn("mr-2 h-4 w-4", (field.value || []).includes(option.value) ? "opacity-100" : "opacity-0")}
                            />
                            {option.label}
                            </CommandItem>
                        ))}
                        </CommandGroup>
                    </CommandList>
                    </Command>
                </PopoverContent>
                </Popover>
                <FormMessage />
            </FormItem>
            )}
        />

        {(userProfile && (userProfile.penaltyBalance || 0) > 0 && !isAdminEditMode) && (
            <FormField
            control={form.control}
            name="penaltyPaidAmount"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Amount Towards Penalties ({settings.currencySymbol}) (Optional)</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="e.g. 500" {...field} />
                </FormControl>
                <FormDescription className="text-primary font-medium">
                    You have an outstanding penalty balance of {settings.currencySymbol}{(userProfile.penaltyBalance || 0).toLocaleString()}. 
                    Enter an amount to pay towards this balance.
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
        )}

        {isAdminEditMode && ( // Admin can edit penalty paid amount directly
             <FormField
             control={form.control}
             name="penaltyPaidAmount"
             render={({ field }) => (
                 <FormItem>
                 <FormLabel>Penalty Paid Amount ({settings.currencySymbol})</FormLabel>
                 <FormControl>
                     <Input type="number" placeholder="e.g. 500" {...field} />
                 </FormControl>
                 <FormDescription>Amount paid towards penalties, if any.</FormDescription>
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
                <FormControl>
                <Textarea
                    placeholder="Any additional notes for this contribution (e.g., payment method, reference)..."
                    className="resize-none"
                    rows={3}
                    {...field}
                />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />
        {isAdminEditMode ? (
            <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancelAdminEdit} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !onSaveAdminEdit}>
                {loading ? "Saving..." : "Save Changes"}
            </Button>
            </DialogFooter>
        ) : (
            <Button type="submit" className="w-full" disabled={loading || !userProfile || userProfile.accessLevel > 3}>
            {loading ? "Submitting..." : "Submit Contribution"}
            </Button>
        )}
        </form>
    </Form>
  );

  if (isAdminEditMode) {
    return (
        <>
            <DialogHeader>
                <DialogTitle>Edit Contribution Record</DialogTitle>
                <DialogDesc>Modify the details of this contribution. Ensure accuracy.</DialogDesc>
            </DialogHeader>
            <div className="py-4 max-h-[70vh] overflow-y-auto pr-2">
                {formContent}
            </div>
        </>
    );
  }

  return (
    <Card {...formWrapperProps}>
      <CardHeader>
        <CardTitle>Make a Contribution</CardTitle>
        <CardDescription>Fill in the details for your contribution. Ensure all information is accurate.</CardDescription>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}
