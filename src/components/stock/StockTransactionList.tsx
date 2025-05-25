
"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { StockTransaction } from '@/lib/types';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { useSettings } from '@/contexts/SettingsProvider';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

export default function StockTransactionList() {
  const { db } = useFirebase();
  const { settings } = useSettings();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const transactionsRef = collection(db, "stockTransactions");
    const q = query(transactionsRef, orderBy("date", "desc"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedTransactions: StockTransaction[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt);
        fetchedTransactions.push({ 
            id: doc.id, 
            ...data,
            date,
            createdAt 
        } as StockTransaction);
      });
      setTransactions(fetchedTransactions);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching stock transactions:", err);
      toast({
        title: "Error Fetching Transactions",
        description: `Could not load stock transaction history: ${err.message}. Check Firestore permissions.`,
        variant: "destructive",
        duration: 7000,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, toast]);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No stock transactions recorded yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Item Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead className="text-right">Unit Cost ({settings.currencySymbol})</TableHead>
          <TableHead>Supplier/Issued To</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead>Recorded By</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell>{format(transaction.date, "PP pp")}</TableCell>
            <TableCell className="font-medium">{transaction.itemName}</TableCell>
            <TableCell>
              {transaction.transactionType === 'IN' ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300 border-green-300 dark:border-green-700 flex items-center w-fit">
                  <ArrowUpCircle className="mr-1 h-3.5 w-3.5" /> IN
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300 border-red-300 dark:border-red-700 flex items-center w-fit">
                  <ArrowDownCircle className="mr-1 h-3.5 w-3.5" /> OUT
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right">{transaction.quantity.toLocaleString()}</TableCell>
            <TableCell className="text-right">
              {transaction.transactionType === 'IN' && transaction.unitCost !== undefined
                ? transaction.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : <span className="text-muted-foreground/70">-</span>}
            </TableCell>
            <TableCell>
                {transaction.transactionType === 'IN' ? transaction.supplier : transaction.issuedTo}
                {!transaction.supplier && !transaction.issuedTo && <span className="text-muted-foreground/70">-</span>}
            </TableCell>
            <TableCell className="max-w-xs truncate" title={transaction.notes}>
                {transaction.notes || <span className="text-muted-foreground/70">-</span>}
            </TableCell>
            <TableCell>{transaction.recordedByName}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
