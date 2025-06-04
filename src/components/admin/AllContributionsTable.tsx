
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Contribution, ContributionFormValues } from '@/lib/types';
import { useSettings } from '@/contexts/SettingsProvider';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { format, parse, addMonths, startOfMonth, setDate, getYear, getMonth, subMonths } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle, ClipboardList, Search, XCircle, Edit2, MoreHorizontal, CircleSlash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent as AlertContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger as AlertTrigger
} from "@/components/ui/alert-dialog";
import ContributionForm from '@/components/contributions/ContributionForm';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


const generateMonthFilterOptions = () => {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 24; i >= 0; i--) {
    options.push({
      value: format(subMonths(today, i), "yyyy-MM"),
      label: format(subMonths(today, i), "MMMM yyyy"),
    });
  }
  for (let i = 1; i <= 6; i++) {
     options.push({
      value: format(addMonths(today, i), "yyyy-MM"),
      label: format(addMonths(today, i), "MMMM yyyy"),
    });
  }
  return options.sort((a, b) => b.value.localeCompare(a.value));
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
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | "on-time" | "late" | "voided">("all");

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [contributionToEdit, setContributionToEdit] = useState<Contribution | null>(null);
  const [contributionToVoid, setContributionToVoid] = useState<Contribution | null>(null);
  const [isVoidConfirmOpen, setIsVoidConfirmOpen] = useState(false);

  const monthFilterOptions = useMemo(() => generateMonthFilterOptions(), []);
  const memberFilterOptions = useMemo(() => {
    const members = new Map<string, string>();
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
        const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined);

        fetchedContributions.push({
            id: doc.id,
            ...data,
            datePaid,
            createdAt,
            updatedAt,
            monthsCovered: Array.isArray(data.monthsCovered) ? data.monthsCovered.sort() : [],
            penaltyPaidAmount: data.penaltyPaidAmount || 0,
            status: data.status || 'active',
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
    if (contrib.status === 'voided') return false; // Voided contributions are not considered late for this visual cue
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
      if (selectedStatusFilter === 'voided') {
        filtered = filtered.filter(c => c.status === 'voided');
      } else {
        const isLateFilter = selectedStatusFilter === 'late';
        filtered = filtered.filter(c => c.status !== 'voided' && isVisuallyLate(c) === isLateFilter);
      }
    }
    setDisplayedContributions(filtered);
  }, [allContributions, searchTerm, selectedMemberFilter, selectedMonthFilter, selectedStatusFilter]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedMemberFilter("all");
    setSelectedMonthFilter("all");
    setSelectedStatusFilter("all");
  };

  const handleEditContribution = (contribution: Contribution) => {
    if (contribution.status === 'voided') {
      toast({ title: "Action Denied", description: "Cannot edit a voided contribution.", variant: "destructive" });
      return;
    }
    setContributionToEdit(contribution);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedContribution = async (data: ContributionFormValues, contributionId: string) => {
    try {
      const contribDocRef = doc(db, "contributions", contributionId);
      const datePaidTimestamp = data.datePaid ? Timestamp.fromDate(data.datePaid) : serverTimestamp();

      const updateData: Partial<Contribution> = {
        amount: data.amount,
        monthsCovered: data.monthsCovered.sort(),
        penaltyPaidAmount: data.penaltyPaidAmount || 0,
        notes: data.notes || "",
        datePaid: datePaidTimestamp,
        updatedAt: serverTimestamp(),
        status: 'active', // Ensure editing makes it active if it was somehow not.
      };

      await updateDoc(contribDocRef, updateData);
      toast({ title: "Contribution Updated", description: "The contribution record has been successfully updated." });
      setIsEditDialogOpen(false);
      setContributionToEdit(null);
    } catch (error: any) {
      console.error("Error updating contribution:", error);
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleVoidContribution = (contribution: Contribution) => {
    if (contribution.status === 'voided') {
      toast({ title: "Already Voided", description: "This contribution is already voided.", variant: "default" });
      return;
    }
    setContributionToVoid(contribution);
    setIsVoidConfirmOpen(true);
  };

  const confirmVoidContribution = async () => {
    if (!contributionToVoid) return;
    try {
      const contribDocRef = doc(db, "contributions", contributionToVoid.id!);
      await updateDoc(contribDocRef, {
        status: 'voided',
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Contribution Voided", description: `Contribution from ${contributionToVoid.memberName} has been voided.` });
      setIsVoidConfirmOpen(false);
      setContributionToVoid(null);
    } catch (error: any) {
      console.error("Error voiding contribution:", error);
      toast({ title: "Voiding Failed", description: error.message, variant: "destructive" });
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
    <>
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle>All Member Contributions</CardTitle>
        <CardDescription>A comprehensive record of all contributions received. Use filters to narrow down results. Edit/Void actions available for Admins.</CardDescription>
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
                <Select value={selectedStatusFilter} onValueChange={(v) => setSelectedStatusFilter(v as "all" | "on-time" | "late" | "voided")}>
                    <SelectTrigger id="filter-status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="on-time">On Time</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="voided">Voided</SelectItem>
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
                <TableHead>Overall Status</TableHead>
                <TableHead className="hidden md:table-cell">Notes</TableHead>
                <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {displayedContributions.map((contrib) => {
                const isVoided = contrib.status === 'voided';
                return (
                    <TableRow key={contrib.id} className={isVoided ? "opacity-60" : ""}>
                    <TableCell className={isVoided ? "line-through" : ""}>{contrib.datePaid ? format(new Date(contrib.datePaid), "PP p") : 'Processing...'}</TableCell>
                    <TableCell className={`font-medium ${isVoided ? "line-through" : ""}`}>{contrib.memberName || <span className="text-muted-foreground/70">N/A</span>}</TableCell>
                    <TableCell className={`text-right ${isVoided ? "line-through" : ""}`}>{contrib.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className={`text-right ${isVoided ? "line-through" : ""}`}>
                        {(contrib.penaltyPaidAmount || 0) > 0 ? (
                        <span className="text-orange-600 dark:text-orange-400">
                            {contrib.penaltyPaidAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        ) : (
                        <span className="text-muted-foreground/70">-</span>
                        )}
                    </TableCell>
                    <TableCell className={isVoided ? "line-through" : ""}>{contrib.monthsCovered.map(m => format(parse(m + '-01', 'yyyy-MM-dd', new Date()), "MMM yy")).join(', ')}</TableCell>
                    <TableCell>{getOverallStatusBadge(contrib)}</TableCell>
                    <TableCell className={`hidden md:table-cell max-w-xs truncate ${isVoided ? "line-through" : ""}`} title={contrib.notes || undefined}>
                        {contrib.notes || <span className="text-muted-foreground/70">-</span>}
                    </TableCell>
                    <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleEditContribution(contrib)} disabled={isVoided}>
                                    <Edit2 className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleVoidContribution(contrib)} disabled={isVoided} className={!isVoided ? "text-destructive focus:text-destructive focus:bg-destructive/10" : ""}>
                                    <CircleSlash className="mr-2 h-4 w-4" /> Void
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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

    <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
        setIsEditDialogOpen(isOpen);
        if (!isOpen) setContributionToEdit(null);
    }}>
        <DialogContent className="sm:max-w-md">
            {contributionToEdit && (
                <ContributionForm
                    contributionToEdit={contributionToEdit}
                    isAdminEditMode={true}
                    onSaveAdminEdit={handleSaveEditedContribution}
                    onCancelAdminEdit={() => {
                        setIsEditDialogOpen(false);
                        setContributionToEdit(null);
                    }}
                />
            )}
        </DialogContent>
    </Dialog>

    <AlertDialog open={isVoidConfirmOpen} onOpenChange={setIsVoidConfirmOpen}>
        <AlertContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to void this contribution?</AlertDialogTitle>
            <AlertDialogDescription>
                This action will mark the contribution by "{contributionToVoid?.memberName}" for period(s) {contributionToVoid?.monthsCovered.join(', ')} as voided.
                This cannot be undone easily.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setContributionToVoid(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmVoidContribution} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Void Contribution</AlertDialogAction>
            </AlertDialogFooter>
        </AlertContent>
    </AlertDialog>
    </>
  );
}
