
"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { BankBalance } from '@/lib/types';
import { useAuth } from '@/contexts/AuthProvider';
import { useSettings } from '@/contexts/SettingsProvider';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { format, parse } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit2, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger, // Ensure AlertDialogTrigger is imported
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';


interface BankBalanceListProps {
  onEditBalance: (balance: BankBalance) => void;
}

export default function BankBalanceList({ onEditBalance }: BankBalanceListProps) {
  const { userProfile } = useAuth();
  const { settings } = useSettings();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [balances, setBalances] = useState<BankBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceToDelete, setBalanceToDelete] = useState<BankBalance | null>(null);

  const canManageBankBalances = userProfile && userProfile.accessLevel <= 1;

  useEffect(() => {
    setLoading(true);
    const balancesRef = collection(db, "bankBalances");
    const q = query(balancesRef, orderBy("monthYear", "desc")); 

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedBalances: BankBalance[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const lastUpdated = data.lastUpdated instanceof Timestamp ? data.lastUpdated.toDate() : (data.lastUpdated?.seconds ? new Timestamp(data.lastUpdated.seconds, data.lastUpdated.nanoseconds).toDate() : null);
        
        fetchedBalances.push({ 
            id: doc.id, 
            ...data,
            lastUpdated,
         } as BankBalance);
      });
      setBalances(fetchedBalances);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching bank balances:", err);
      toast({
        title: "Error Fetching Bank Balances",
        description: `Could not load bank balances: ${err.message}. Check Firestore permissions for 'bankBalances'.`,
        variant: "destructive",
        duration: 7000,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, toast]);

  const handleDeleteBalance = async () => {
    if (!balanceToDelete || !balanceToDelete.id || !canManageBankBalances) {
      toast({ title: "Error", description: "Cannot delete balance or insufficient permissions.", variant: "destructive" });
      setBalanceToDelete(null);
      return;
    }
    try {
      await deleteDoc(doc(db, "bankBalances", balanceToDelete.id));
      toast({ title: "Bank Balance Deleted", description: `Balance for ${balanceToDelete.monthYear} has been removed.` });
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    } finally {
      setBalanceToDelete(null);
    }
  };


  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Loading Bank Balances...</CardTitle></CardHeader>
        <CardContent className="space-y-3 p-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
        </CardContent>
      </Card>
    );
  }
  
  if (balances.length === 0) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>Bank Balances</CardTitle>
          <CardDescription>No monthly bank balance entries found.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Users with Level 1 access can add monthly bank balance records.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Bank Balance Records</CardTitle>
        <CardDescription>Summary of opening/closing balances, interest, and charges.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month/Year</TableHead>
              <TableHead className="text-right">Opening Balance ({settings.currencySymbol})</TableHead>
              <TableHead className="text-right">Closing Balance ({settings.currencySymbol})</TableHead>
              <TableHead className="text-right">Interest Earned ({settings.currencySymbol})</TableHead>
              <TableHead className="text-right">Bank Charges ({settings.currencySymbol})</TableHead>
              <TableHead className="hidden sm:table-cell">Recorded By</TableHead>
              <TableHead className="hidden sm:table-cell">Last Updated</TableHead>
              {canManageBankBalances && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.map((balance) => (
              <TableRow key={balance.id}>
                <TableCell className="font-medium">
                  {format(parse(balance.monthYear, 'yyyy-MM', new Date()), "MMMM yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  {balance.openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {balance.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right text-green-600 dark:text-green-400">
                  {balance.interestEarned?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || <span className="text-muted-foreground/70">-</span>}
                </TableCell>
                <TableCell className="text-right text-red-600 dark:text-red-400">
                  {balance.bankCharges?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || <span className="text-muted-foreground/70">-</span>}
                </TableCell>
                <TableCell className="hidden sm:table-cell">{balance.recordedByName || <span className="text-muted-foreground/70">N/A</span>}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  {balance.lastUpdated ? format(balance.lastUpdated, "PPpp") : <span className="text-muted-foreground/70">N/A</span>}
                </TableCell>
                {canManageBankBalances && (
                  <TableCell>
                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onEditBalance(balance)}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => setBalanceToDelete(balance)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the bank balance entry
                            for "{balanceToDelete?.monthYear ? format(parse(balanceToDelete.monthYear, 'yyyy-MM', new Date()), "MMMM yyyy") : 'this entry'}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setBalanceToDelete(null)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteBalance}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
