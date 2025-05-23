
"use client";

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Contribution } from '@/lib/types';
import { useAuth } from '@/contexts/AuthProvider';
import { useSettings } from '@/contexts/SettingsProvider';
import { format } from 'date-fns'; // Ensure date-fns is installed

// Mock data - replace with actual data fetching
const mockUserContributions: Contribution[] = [
  { id: 'c1', userId: 'user123', memberName: 'John Doe', amount: 5000, monthsCovered: ['2024-05', '2024-06'], datePaid: new Date('2024-05-03'), isLate: false, notes: 'Advance payment' },
  { id: 'c2', userId: 'user123', memberName: 'John Doe', amount: 2500, monthsCovered: ['2024-04'], datePaid: new Date('2024-04-10'), isLate: true },
  { id: 'c3', userId: 'user123', memberName: 'John Doe', amount: 2500, monthsCovered: ['2024-03'], datePaid: new Date('2024-03-01'), isLate: false },
];

export default function ContributionList() {
  const { userProfile } = useAuth();
  const { settings } = useSettings();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile) {
      // In a real app, fetch contributions for userProfile.uid from Firestore
      // For now, use mock data
      setContributions(mockUserContributions.sort((a,b) => b.datePaid.getTime() - a.datePaid.getTime()));
    }
    setLoading(false);
  }, [userProfile]);

  if (loading) {
    return <Card><CardHeader><CardTitle>Loading contributions...</CardTitle></CardHeader><CardContent><div className="animate-pulse space-y-2"><div className="h-8 bg-muted rounded"></div><div className="h-8 bg-muted rounded"></div><div className="h-8 bg-muted rounded"></div></div></CardContent></Card>;
  }

  if (!userProfile) {
    return <Card><CardHeader><CardTitle>Not Authenticated</CardTitle></CardHeader><CardContent><p>Please login to view your contributions.</p></CardContent></Card>;
  }
  
  if (contributions.length === 0) {
     return <Card><CardHeader><CardTitle>My Contributions</CardTitle><CardDescription>You have not made any contributions yet.</CardDescription></CardHeader><CardContent><p className="text-center text-muted-foreground py-4">No contributions found.</p></CardContent></Card>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>My Contributions</CardTitle>
        <CardDescription>A record of your contributions to the group.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date Paid</TableHead>
              <TableHead>Amount ({settings.currencySymbol})</TableHead>
              <TableHead>Months Covered</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contributions.map((contrib) => (
              <TableRow key={contrib.id}>
                <TableCell>{format(contrib.datePaid, "PPP")}</TableCell>
                <TableCell>{contrib.amount.toLocaleString()}</TableCell>
                <TableCell>{contrib.monthsCovered.map(m => format(new Date(m + '-02'), "MMM yyyy")).join(', ')}</TableCell>
                <TableCell>
                  {contrib.isLate ? (
                    <Badge variant="destructive">Late</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200 border-green-300 dark:border-green-600">On Time</Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-xs truncate">{contrib.notes || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
