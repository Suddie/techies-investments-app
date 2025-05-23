"use client";

import { useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2 } from 'lucide-react';
import { summarizeDataForRole, type SummarizeDataForRoleInput } from '@/ai/flows/summarize-data-for-role'; // Assuming the path
import { useToast } from '@/hooks/use-toast';

const roles: SummarizeDataForRoleInput['role'][] = ['Admin', 'Member', 'Finance Professional'];

const formSchema = z.object({
  role: z.enum(roles),
  totalFunds: z.coerce.number().positive("Total funds must be positive."),
  totalExpenditures: z.coerce.number().nonnegative("Expenditures cannot be negative."),
  totalContributions: z.coerce.number().nonnegative("Contributions cannot be negative."),
  projectCompletionPercentage: z.coerce.number().min(0).max(100, "Percentage must be between 0 and 100."),
  overdueContributionsCount: z.coerce.number().int().nonnegative("Count cannot be negative."),
});

export default function AiSummaryGenerator() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: 'Member',
      totalFunds: 100000,
      totalExpenditures: 5000,
      totalContributions: 15000,
      projectCompletionPercentage: 50,
      overdueContributionsCount: 3,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setSummary(null);
    try {
      const result = await summarizeDataForRole(values);
      setSummary(result.summary);
      toast({ title: "Summary Generated", description: "AI-powered summary is ready." });
    } catch (error) {
      console.error("Error generating AI summary:", error);
      toast({ title: "Error", description: "Failed to generate summary. Please try again.", variant: "destructive" });
      setSummary("Failed to generate summary. Please check the console for more details.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI-Powered Financial Summary</CardTitle>
        <CardDescription>Enter financial data and select a role to generate a tailored summary using AI.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map(roleName => (
                          <SelectItem key={roleName} value={roleName}>{roleName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalFunds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Funds</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 100000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalExpenditures"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Expenditures (Current Month)</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 5000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalContributions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Contributions (Current Month)</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 15000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="projectCompletionPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Completion (%)</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 50" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="overdueContributionsCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overdue Contributions Count</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 3" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full md:w-auto" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              {loading ? "Generating..." : "Generate Summary"}
            </Button>
          </form>
        </Form>

        {summary && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-2">Generated Summary:</h3>
            <Textarea value={summary} readOnly rows={10} className="bg-muted/50 whitespace-pre-wrap" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
