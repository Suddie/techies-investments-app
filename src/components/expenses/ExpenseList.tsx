
"use client";

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit2, Trash2 } from "lucide-react";
import type { Expense } from '@/lib/types';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { useSettings } from '@/contexts/SettingsProvider';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
// Placeholder for delete function if implemented
// import { doc, deleteDoc } from "firebase/firestore";

interface ExpenseListProps {
  onEditExpense: (expense: Expense) => void;
}

export default function ExpenseList({ onEditExpense }: ExpenseListProps) {
  const { db } = useFirebase();
  const { userProfile } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const canManageExpenses = userProfile && userProfile.accessLevel <= 1;

  useEffect(() => {
    const q = query(collection(db, "expenses"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expensesData: Expense[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore Timestamp to Date for client-side handling
        const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt);
        expensesData.push({ id: doc.id, ...data, date, createdAt } as Expense);
      });
      setExpenses(expensesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching expenses: ", error);
      toast({ title: "Error", description: "Could not fetch expenses.", variant: "destructive"});
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, toast]);

  const handleDeleteExpense = async (expenseId: string) => {
    if (!canManageExpenses) {
        toast({ title: "Access Denied", description: "You do not have permission to delete expenses.", variant: "destructive"});
        return;
    }
    if (confirm("Are you sure you want to delete this expense? This action cannot be undone.")) {
        // Example: await deleteDoc(doc(db, "expenses", expenseId));
        console.log("Deleting expense (mock operation):", expenseId);
        toast({ title: "Expense Deleted (Mock)", description: "The expense has been removed." });
        // Firestore onSnapshot will update the list automatically
    }
  };

  if (loading) {
    return (
      <div className="space-y-2 mt-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No expenses recorded yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Amount ({settings.currencySymbol})</TableHead>
          <TableHead>Entered By</TableHead>
          {canManageExpenses && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((expense) => (
          <TableRow key={expense.id}>
            <TableCell>{format(new Date(expense.date), "PP")}</TableCell>
            <TableCell className="font-medium max-w-xs truncate" title={expense.description}>{expense.description}</TableCell>
            <TableCell><Badge variant="outline">{expense.category}</Badge></TableCell>
            <TableCell className="text-right">{expense.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
            <TableCell>{expense.enteredByName}</TableCell>
            {canManageExpenses && (
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
                    <DropdownMenuItem onClick={() => onEditExpense(expense)}>
                      <Edit2 className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    {/* 
                    <DropdownMenuItem 
                        onClick={() => expense.id && handleDeleteExpense(expense.id)} 
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        disabled={!expense.id} // Disable if ID is somehow missing
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete (Mock)
                    </DropdownMenuItem>
                    */}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
