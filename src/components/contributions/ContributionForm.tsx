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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format, addMonths, subMonths } from "date-fns";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { useSettings } from "@/contexts/SettingsProvider";
import { useFirebase } from "@/contexts/FirebaseProvider";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";


const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth(); // 0-11

const generateMonthOptions = () => {
  const options = [];
  const startDate = subMonths(new Date(currentYear, currentMonth, 1), 12);
  const endDate = addMonths(new Date(currentYear, currentMonth, 1), 12);

  let currentDate = startDate;
  while (currentDate <= endDate) {
    options.push({
      value: format(currentDate, "yyyy-MM"),
      label: format(currentDate, "MMMM yyyy"),
    });
    currentDate = addMonths(currentDate, 1);
  }
  return options;
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
      .min(settings.contributionMin || 0, `Minimum contribution is ${settings.currencySymbol}${settings.contributionMin || 0}`)
      .max(settings.contributionMax || Infinity, `Maximum contribution is ${settings.currencySymbol}${settings.contributionMax || Infinity}`),
    monthsCovered: z.array(z.string()).min(1, "Please select at least one month."),
    notes: z.string().optional(),
  });


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: settings.contributionMin || 0,
      monthsCovered: [],
      notes: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userProfile) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // In a real app, this would go to a 'contributions' collection
      // For now, we'll just log it and show a success toast
      const contributionData = {
        userId: userProfile.uid,
        memberName: userProfile.name,
        amount: values.amount,
        monthsCovered: values.monthsCovered,
        datePaid: serverTimestamp(), // Use serverTimestamp for Firestore
        isLate: false, // This would be determined by system logic (e.g. Cloud Function)
        notes: values.notes || "",
      };
      
      // Example: await addDoc(collection(db, "contributions"), contributionData);
      console.log("Contribution submitted:", contributionData);

      toast({
        title: "Contribution Submitted",
        description: `Amount: ${settings.currencySymbol}${values.amount} for ${values.monthsCovered.join(', ')}`,
      });
      form.reset({ amount: settings.contributionMin || 0, monthsCovered: [], notes: "" });
    } catch (error) {
      console.error("Error submitting contribution:", error);
      toast({
        title: "Submission Failed",
        description: "Could not submit contribution. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Make a Contribution</CardTitle>
        <CardDescription>Enter your contribution details below.</CardDescription>
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
                    <Input type="number" placeholder={`e.g. ${settings.contributionMin}`} {...field} />
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
                            "w-full justify-between",
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
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search months..." />
                        <CommandEmpty>No months found.</CommandEmpty>
                        <CommandList>
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
                                    field.onChange(newValue);
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
                      placeholder="Any additional notes for this contribution..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Submitting..." : "Submit Contribution"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// For Shadcn UI Card
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
