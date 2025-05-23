
"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Contribution } from '@/lib/types';
import { useAuth } from '@/contexts/AuthProvider';
import { useSettings } from '@/contexts/SettingsProvider';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle } from 'lucide-react'; // Added icons

export default function ContributionList() {
  const { userProfile } = useAuth();
  const { settings } = useSettings();
  const { db } = useFirebase();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile) {
      setLoading(false);
      // Error handled by ProtectedRoute or UI will show "login to view"
      return;
    }

    setLoading(true);
    setError(null);
    const contributionsRef = collection(db, "contributions");
    const q = query(
      contributionsRef, 
      where("userId", "==", userProfile.uid), 
      orderBy("datePaid", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedContributions: Contribution[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore Timestamp to Date for client-side handling
        const datePaid = data.datePaid instanceof Timestamp ? data.datePaid.toDate() : (data.datePaid ? new Date(data.datePaid) : new Date());
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
        
        fetchedContributions.push({ 
            id: doc.id, 
            ...data, 
            datePaid,
            createdAt,
            monthsCovered: Array.isArray(data.monthsCovered) ? data.monthsCovered.sort() : [], // Ensure it's an array and sort
         } as Contribution);
      });
      setContributions(fetchedContributions);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching contributions:", err);
      setError("Failed to load contributions. Please try again later.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile, db]);

  if (loading) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Loading Your Contributions...</CardTitle>
                <CardDescription>Fetching your payment history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
            </CardContent>
        </Card>
    );
  }

  if (error) {
    return (
        <Card className="shadow-lg border-destructive">
            <CardHeader>
                <CardTitle className="flex items-center text-destructive">
                    <AlertTriangle className="mr-2 h-5 w-5"/> Error Loading Contributions
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-destructive">{error}</p>
            </CardContent>
        </Card>
    );
  }
  
  if (!userProfile) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Please log in to view your contributions.</p>
            </CardContent>
        </Card>
    );
  }
  
  if (contributions.length === 0) {
     return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>My Contributions</CardTitle>
                <CardDescription>You have not made any contributions yet.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground py-8">
                    No contributions found. Start by making one!
                </p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle>My Contributions History</CardTitle>
        <CardDescription>A detailed record of all your contributions to the group.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date Paid</TableHead>
              <TableHead className="text-right">Amount ({settings.currencySymbol})</TableHead>
              <TableHead>Months Covered</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contributions.map((contrib) => (
              <TableRow key={contrib.id}>
                <TableCell>{contrib.datePaid ? format(new Date(contrib.datePaid), "PPP p") : 'Processing...'}</TableCell>
                <TableCell className="text-right font-medium">{contrib.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell>{contrib.monthsCovered.map(m => format(new Date(m + '-02'), "MMM yyyy")).join(', ')}</TableCell>
                <TableCell>
                  {contrib.isLate ? (
                    <Badge variant="destructive" className="flex items-center w-fit">
                        <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Late
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300 border-green-300 dark:border-green-700 flex items-center w-fit">
                        <CheckCircle className="mr-1 h-3.5 w-3.5" /> On Time
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell max-w-xs truncate" title={contrib.notes || undefined}>
                    {contrib.notes || <span className="text-muted-foreground/70">-</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {contributions.length > 5 && (
        <CardFooter>
            <p className="text-xs text-muted-foreground">Displaying latest {contributions.length} contributions.</p>
        </CardFooter>
      )}
    </Card>
  );
}
