
"use client";

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit2, Trash2 } from "lucide-react";
import type { Expense } from '@/lib/types';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { useSettings } from '@/contexts/SettingsProvider';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';


const ITEMS_PER_PAGE = 15;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);


  const canManageExpenses = userProfile && userProfile.accessLevel <= 1;

  useEffect(() => {
    const q = query(collection(db, "expenses"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expensesData: Expense[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt);
        expensesData.push({ id: doc.id, ...data, date, createdAt } as Expense);
      });
      setExpenses(expensesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching expenses: ", error);
      toast({ 
        title: "Permission Error Fetching Expenses", 
        description: "Could not fetch expenses. This might be due to insufficient permissions or missing user profile data in Firestore (e.g., 'accessLevel'). Please ensure your user profile is correctly set up in the database by an admin.", 
        variant: "destructive",
        duration: 10000,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, toast]);

  const handleDeleteExpense = async () => {
    if (!expenseToDelete || !expenseToDelete.id || !canManageExpenses) {
        toast({ title: "Access Denied", description: "You do not have permission to delete expenses or no expense selected.", variant: "destructive"});
        setExpenseToDelete(null);
        return;
    }
    try {
        await deleteDoc(doc(db, "expenses", expenseToDelete.id));
        toast({ title: "Expense Deleted", description: `Expense "${expenseToDelete.description}" has been removed.` });
    } catch (error: any) {
        console.error("Error deleting expense:", error);
        toast({ title: "Delete Failed", description: `Could not delete expense: ${error.message}`, variant: "destructive" });
    } finally {
        setExpenseToDelete(null);
    }
  };

  const totalPages = Math.ceil(expenses.length / ITEMS_PER_PAGE);
  const paginatedExpenses = expenses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Loading Expenses...</CardTitle></CardHeader>
        <CardContent className="space-y-2 mt-4">
            {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
        </CardContent>
      </Card>
    );
  }

  if (expenses.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Expenses</CardTitle>
                <CardDescription>No expenses recorded yet.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground py-8">No expenses recorded yet.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <AlertDialog>
    <Card>
        <CardHeader>
            <CardTitle>Expense Records</CardTitle>
            <CardDescription>A list of all recorded expenditures.</CardDescription>
        </CardHeader>
        <CardContent>
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
                {paginatedExpenses.map((expense) => (
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
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                    onClick={() => setExpenseToDelete(expense)}
                                >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    )}
                </TableRow>
                ))}
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
    <AlertDialogContent>
        <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the expense record for
            "{expenseToDelete?.description}".
        </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
        <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={handleDeleteExpense}>Delete</AlertDialogAction>
        </AlertDialogFooter>
    </AlertDialogContent>
    </AlertDialog>
  );
}
