
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format, addMonths, subMonths, getYear, getMonth } from "date-fns";
import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { useSettings } from "@/contexts/SettingsProvider";
import { useFirebase } from "@/contexts/FirebaseProvider";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";


const generateMonthOptions = () => {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  const startDate = subMonths(new Date(getYear(today), getMonth(today), 1), 12); // 12 months ago
  const endDate = addMonths(new Date(getYear(today), getMonth(today), 1), 12); // 12 months ahead

  let currentDate = startDate;
  while (currentDate <= endDate) {
    options.push({
      value: format(currentDate, "yyyy-MM"),
      label: format(currentDate, "MMMM yyyy"),
    });
    currentDate = addMonths(currentDate, 1);
  }
  return options.sort((a, b) => a.value.localeCompare(b.value)); // Sort chronologically
};


export default function ContributionForm() {
  const { userProfile } = useAuth();
  const { settings } = useSettings();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const monthOptions = useMemo(() => generateMonthOptions(), []);
  
  const formSchema = z.object({
    amount: z.coerce.number()
      .min(settings.contributionMin || 1, `Minimum contribution is ${settings.currencySymbol}${settings.contributionMin || 1}`)
      .max(settings.contributionMax || Infinity, `Maximum contribution is ${settings.currencySymbol}${settings.contributionMax || 'Unlimited'}`),
    monthsCovered: z.array(z.string()).min(1, "Please select at least one month."),
    notes: z.string().max(500, "Notes are too long.").optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    // Default values will be set in useEffect to reflect dynamic settings
  });
  
  useEffect(() => {
    form.reset({
        amount: settings.contributionMin || 0,
        monthsCovered: [],
        notes: "",
    });
  }, [settings.contributionMin, form]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userProfile) {
      toast({ title: "Authentication Error", description: "You must be logged in to make a contribution.", variant: "destructive" });
      return;
    }
    if (userProfile.accessLevel > 3) {
        toast({ title: "Permission Denied", description: "You do not have permission to make contributions.", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
      const contributionData = {
        userId: userProfile.uid,
        memberName: userProfile.name,
        amount: values.amount,
        monthsCovered: values.monthsCovered.sort(), // Ensure months are sorted
        datePaid: serverTimestamp(), 
        isLate: false, // Placeholder: actual logic would be server-side or more complex client-side
        notes: values.notes || "",
        createdAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, "contributions"), contributionData);

      toast({
        title: "Contribution Submitted Successfully!",
        description: `Your contribution of ${settings.currencySymbol}${values.amount} for ${values.monthsCovered.join(', ')} has been recorded.`,
      });
      form.reset({ amount: settings.contributionMin || 0, monthsCovered: [], notes: "" });
    } catch (error: any) {
      console.error("Error submitting contribution:", error);
      toast({
        title: "Contribution Submission Failed",
        description: error.message || "Could not submit contribution. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>Make a Contribution</CardTitle>
        <CardDescription>Fill in the details for your contribution. Ensure all information is accurate.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ({settings.currencySymbol})</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder={`e.g. ${settings.contributionMin || 1000}`} {...field} />
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
                          className={cn(
                            "w-full justify-between min-h-[2.5rem]", // Ensure consistent height with Input
                            !field.value?.length && "text-muted-foreground"
                          )}
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
                                  value={option.label} // value here is for search, not the form value
                                  onSelect={() => {
                                      const currentValue = field.value || [];
                                      const newValue = currentValue.includes(option.value)
                                      ? currentValue.filter((v) => v !== option.value)
                                      : [...currentValue, option.value];
                                      field.onChange(newValue.sort()); // Keep selected values sorted
                                  }}
                                >
                                <Check
                                    className={cn(
                                    "mr-2 h-4 w-4",
                                    (field.value || []).includes(option.value)
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
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
            <Button type="submit" className="w-full" disabled={loading || !userProfile || userProfile.accessLevel > 3}>
              {loading ? "Submitting..." : "Submit Contribution"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
