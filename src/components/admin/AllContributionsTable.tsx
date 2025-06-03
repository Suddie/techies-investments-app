
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Contribution } from '@/lib/types';
import { useSettings } from '@/contexts/SettingsProvider';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { format, parse, addMonths, startOfMonth, setDate, getYear, getMonth } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle, ClipboardList, Search, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const generateMonthFilterOptions = () => {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  // Go back 24 months
  for (let i = 24; i >= 0; i--) {
    options.push({
      value: format(subMonths(today, i), "yyyy-MM"),
      label: format(subMonths(today, i), "MMMM yyyy"),
    });
  }
  // Go forward 6 months
  for (let i = 1; i <= 6; i++) {
     options.push({
      value: format(addMonths(today, i), "yyyy-MM"),
      label: format(addMonths(today, i), "MMMM yyyy"),
    });
  }
  return options.sort((a, b) => b.value.localeCompare(a.value)); // Most recent first
};


export default function AllContributionsTable() {
  const { settings } = useSettings();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [allContributions, setAllContributions] = useState<Contribution[]>([]);
  const [displayedContributions, setDisplayedContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>("all");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | "on-time" | "late">("all");

  const monthFilterOptions = useMemo(() => generateMonthFilterOptions(), []);
  const memberFilterOptions = useMemo(() => {
    const members = new Map<string, string>(); // Store userId -> memberName
    allContributions.forEach(contrib => {
      if (contrib.userId && contrib.memberName && !members.has(contrib.userId)) {
        members.set(contrib.userId, contrib.memberName);
      }
    });
    return Array.from(members.entries()).map(([userId, memberName]) => ({ value: userId, label: memberName })).sort((a,b) => a.label.localeCompare(b.label));
  }, [allContributions]);


  useEffect(() => {
    setLoading(true);
    setError(null);
    const contributionsRef = collection(db, "contributions");
    const q = query(contributionsRef, orderBy("datePaid", "desc"));

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
         } as Contribution);
      });
      setAllContributions(fetchedContributions);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching all contributions:", err);
      setError("Failed to load contributions. Please check Firestore permissions or if a required index is missing.");
      toast({
        title: "Error Fetching Contributions",
        description: `Could not load contributions: ${err.message}`,
        variant: "destructive",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, toast]);

  const isVisuallyLate = (contrib: Contribution): boolean => {
    if (contrib.isLate === true) return true;
    if (contrib.isLate === false) return false;
    if (!contrib.datePaid || !contrib.monthsCovered || contrib.monthsCovered.length === 0) return false;
    try {
      const firstMonthCoveredStr = contrib.monthsCovered[0];
      const firstMonthDate = parse(firstMonthCoveredStr + '-01', 'yyyy-MM-dd', new Date());
      const monthFollowingFirstMonth = addMonths(startOfMonth(firstMonthDate), 1);
      const dueDate = setDate(monthFollowingFirstMonth, 7); 
      const paymentDate = new Date(contrib.datePaid);
      return paymentDate.getFullYear() > dueDate.getFullYear() ||
             (paymentDate.getFullYear() === dueDate.getFullYear() && paymentDate.getMonth() > dueDate.getMonth()) ||
             (paymentDate.getFullYear() === dueDate.getFullYear() && paymentDate.getMonth() === dueDate.getMonth() && paymentDate.getDate() > dueDate.getDate());
    } catch (e) { return false; }
  };

  useEffect(() => {
    let filtered = [...allContributions];

    if (searchTerm) {
      filtered = filtered.filter(c => c.memberName?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (selectedMemberFilter !== "all") {
      filtered = filtered.filter(c => c.userId === selectedMemberFilter);
    }
    if (selectedMonthFilter !== "all") {
      filtered = filtered.filter(c => c.monthsCovered.includes(selectedMonthFilter));
    }
    if (selectedStatusFilter !== "all") {
      const isLateFilter = selectedStatusFilter === 'late';
      filtered = filtered.filter(c => isVisuallyLate(c) === isLateFilter);
    }
    setDisplayedContributions(filtered);
  }, [allContributions, searchTerm, selectedMemberFilter, selectedMonthFilter, selectedStatusFilter]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedMemberFilter("all");
    setSelectedMonthFilter("all");
    setSelectedStatusFilter("all");
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader><CardTitle>Loading All Contributions...</CardTitle><CardDescription>Fetching payment history for all members.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 border-b">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-destructive">
        <CardHeader><CardTitle className="flex items-center text-destructive"><AlertTriangle className="mr-2 h-5 w-5"/> Error Loading Contributions</CardTitle></CardHeader>
        <CardContent><p className="text-destructive">{error}</p></CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle>All Member Contributions</CardTitle>
        <CardDescription>A comprehensive record of all contributions received. Use filters to narrow down results.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 border rounded-lg bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-1.5">
                <label htmlFor="search-member" className="text-sm font-medium">Search by Member</label>
                <Input
                    id="search-member"
                    placeholder="Type member name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
            </div>
             <div className="space-y-1.5">
                <label htmlFor="filter-member" className="text-sm font-medium">Filter by Member</label>
                <Select value={selectedMemberFilter} onValueChange={setSelectedMemberFilter}>
                    <SelectTrigger id="filter-member"><SelectValue placeholder="All Members" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Members</SelectItem>
                        {memberFilterOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="filter-month" className="text-sm font-medium">Filter by Month Covered</label>
                <Select value={selectedMonthFilter} onValueChange={setSelectedMonthFilter}>
                    <SelectTrigger id="filter-month"><SelectValue placeholder="All Months" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {monthFilterOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="filter-status" className="text-sm font-medium">Filter by Status</label>
                <Select value={selectedStatusFilter} onValueChange={(v) => setSelectedStatusFilter(v as "all" | "on-time" | "late")}>
                    <SelectTrigger id="filter-status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="on-time">On Time</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button variant="outline" onClick={handleClearFilters} className="w-full sm:w-auto lg:self-end">
                <XCircle className="mr-2 h-4 w-4" /> Clear Filters
            </Button>
          </div>
        </div>

        {displayedContributions.length === 0 ? (
             <p className="text-center text-muted-foreground py-8">
                <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                No contributions match the current filters.
            </p>
        ) : (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Date Paid</TableHead>
                <TableHead>Member Name</TableHead>
                <TableHead className="text-right">Amount ({settings.currencySymbol})</TableHead>
                <TableHead className="text-right">Penalty Paid ({settings.currencySymbol})</TableHead>
                <TableHead>Months Covered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Notes</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {displayedContributions.map((contrib) => {
                const visuallyLate = isVisuallyLate(contrib);
                return (
                    <TableRow key={contrib.id}>
                    <TableCell>{contrib.datePaid ? format(new Date(contrib.datePaid), "PP p") : 'Processing...'}</TableCell>
                    <TableCell className="font-medium">{contrib.memberName || <span className="text-muted-foreground/70">N/A</span>}</TableCell>
                    <TableCell className="text-right">{contrib.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">
                        {(contrib.penaltyPaidAmount || 0) > 0 ? (
                        <span className="text-orange-600 dark:text-orange-400">
                            {contrib.penaltyPaidAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        ) : (
                        <span className="text-muted-foreground/70">-</span>
                        )}
                    </TableCell>
                    <TableCell>{contrib.monthsCovered.map(m => format(parse(m + '-01', 'yyyy-MM-dd', new Date()), "MMM yy")).join(', ')}</TableCell>
                    <TableCell>
                        {visuallyLate ? (
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
                );
                })}
            </TableBody>
            </Table>
        )}
      </CardContent>
      {displayedContributions.length > 15 && ( 
        <CardFooter>
            <p className="text-xs text-muted-foreground">Displaying {displayedContributions.length} of {allContributions.length} total contributions.</p>
        </CardFooter>
      )}
    </Card>
  );
}
