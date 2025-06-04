
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
import { format, parse, getDay, getDate, addMonths, startOfMonth, setDate } from 'date-fns'; // Added addMonths, startOfMonth, setDate
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle, DollarSign, CircleSlash } from 'lucide-react'; // Added CircleSlash

export default function ContributionList() {
  const { userProfile } = useAuth();
  const { settings } = useSettings();
  const { db } = useFirebase();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    if (!userProfile) {
      setLoading(false);
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
        const datePaid = data.datePaid instanceof Timestamp ? data.datePaid.toDate() : (data.datePaid ? new Date(data.datePaid) : new Date());
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
        
        fetchedContributions.push({ 
            id: doc.id, 
            ...data, 
            datePaid,
            createdAt,
            monthsCovered: Array.isArray(data.monthsCovered) ? data.monthsCovered.sort() : [], 
            penaltyPaidAmount: data.penaltyPaidAmount || 0,
            status: data.status || 'active', // Ensure status is fetched
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

  // Client-side estimation for visual cue of lateness
  const isVisuallyLate = (contrib: Contribution): boolean => {
    if (contrib.status === 'voided') return false; // Voided contributions are not late
    if (contrib.isLate === true) return true; // Honor existing flag
    if (contrib.isLate === false) return false; // Honor existing flag

    if (!contrib.datePaid || !contrib.monthsCovered || contrib.monthsCovered.length === 0) {
      return false; // Not enough info
    }
    try {
      const firstMonthCoveredStr = contrib.monthsCovered[0];
      const firstMonthDate = parse(firstMonthCoveredStr + '-01', 'yyyy-MM-dd', new Date());
      const monthFollowingFirstMonth = addMonths(startOfMonth(firstMonthDate), 1);
      const dueDate = setDate(monthFollowingFirstMonth, 7); 
      const paymentDate = new Date(contrib.datePaid);
      return paymentDate.getFullYear() > dueDate.getFullYear() ||
             (paymentDate.getFullYear() === dueDate.getFullYear() && paymentDate.getMonth() > dueDate.getMonth()) ||
             (paymentDate.getFullYear() === dueDate.getFullYear() && paymentDate.getMonth() === dueDate.getMonth() && paymentDate.getDate() > dueDate.getDate());
    } catch (e) {
      console.warn("Error parsing date for lateness check", e);
      return false;
    }
  };

  const getOverallStatusBadge = (contrib: Contribution) => {
    if (contrib.status === 'voided') {
      return <Badge variant="destructive" className="flex items-center w-fit"><CircleSlash className="mr-1 h-3.5 w-3.5" /> Voided</Badge>;
    }
    if (isVisuallyLate(contrib)) {
      return <Badge variant="destructive" className="flex items-center w-fit"><AlertTriangle className="mr-1 h-3.5 w-3.5" /> Late</Badge>;
    }
    return <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300 border-green-300 dark:border-green-700 flex items-center w-fit"><CheckCircle className="mr-1 h-3.5 w-3.5" /> On Time</Badge>;
  };

  const paginatedContributions = contributions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(contributions.length / ITEMS_PER_PAGE);


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
              <TableHead className="text-right">For Penalties ({settings.currencySymbol})</TableHead>
              <TableHead>Months Covered</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedContributions.map((contrib) => {
              const isVoided = contrib.status === 'voided';
              return (
                <TableRow key={contrib.id} className={isVoided ? "opacity-60" : ""}>
                  <TableCell className={isVoided ? "line-through" : ""}>{contrib.datePaid ? format(new Date(contrib.datePaid), "PP p") : 'Processing...'}</TableCell>
                  <TableCell className={`text-right font-medium ${isVoided ? "line-through" : ""}`}>{contrib.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className={`text-right ${isVoided ? "line-through" : ""}`}>
                    {(contrib.penaltyPaidAmount || 0) > 0 ? (
                      <span className="text-orange-600 dark:text-orange-400">
                        {contrib.penaltyPaidAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/70">-</span>
                    )}
                  </TableCell>
                  <TableCell className={isVoided ? "line-through" : ""}>{contrib.monthsCovered.map(m => format(parse(m + '-01', 'yyyy-MM-dd', new Date()), "MMM yyyy")).join(', ')}</TableCell>
                  <TableCell>{getOverallStatusBadge(contrib)}</TableCell>
                  <TableCell className={`hidden md:table-cell max-w-xs truncate ${isVoided ? "line-through" : ""}`} title={contrib.notes || undefined}>
                      {contrib.notes || <span className="text-muted-foreground/70">-</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
       {totalPages > 1 && (
        <CardFooter className="flex items-center justify-between pt-4">
            <p className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
    </Card>
  );
}
