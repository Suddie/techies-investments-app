
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ExpenseForm, { type ExpenseFormValues } from "@/components/expenses/ExpenseForm";
import { useState } from "react";
import type { Expense } from "@/lib/types";
import { useAuth } from "@/contexts/AuthProvider";
import { useFirebase } from "@/contexts/FirebaseProvider";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, serverTimestamp, doc, updateDoc, Timestamp } from "firebase/firestore";
import ExpenseList from "@/components/expenses/ExpenseList"; // Import ExpenseList

export default function ExpensesPage() {
  const { userProfile } = useAuth();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const canManageExpenses = userProfile && userProfile.accessLevel <= 1; // Level 1 can CRUD

  const handleAddNewExpense = () => {
    if (!canManageExpenses) {
        toast({ title: "Access Denied", description: "You do not have permission to add expenses.", variant: "destructive"});
        return;
    }
    setEditingExpense(null);
    setIsExpenseFormOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    if (!canManageExpenses) {
        toast({ title: "Access Denied", description: "You do not have permission to edit expenses.", variant: "destructive"});
        return;
    }
    setEditingExpense(expense);
    setIsExpenseFormOpen(true);
  };

  const handleSaveExpense = async (
    data: ExpenseFormValues, 
    subtotal: number, 
    totalAmount: number, 
    expenseId?: string
  ) => {
    if (!userProfile || !canManageExpenses) {
      toast({ title: "Error", description: "You do not have permission to save expenses.", variant: "destructive" });
      return;
    }

    // Convert JS Date to Firestore Timestamp for date field
    const expenseDate = data.date instanceof Date ? Timestamp.fromDate(data.date) : data.date;

    const expenseData: Omit<Expense, "id" | "createdAt" | "date"> & { createdAt?: any; date: any } = {
      date: expenseDate,
      description: data.description,
      category: data.category,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      subtotal: subtotal,
      totalAmount: totalAmount,
      vendor: data.vendor || "",
      receiptUrl: data.receiptUrl || "",
      enteredByUid: userProfile.uid,
      enteredByName: userProfile.name || "Unknown User",
    };

    try {
      if (expenseId) {
        // Update existing expense
        const expenseDocRef = doc(db, "expenses", expenseId);
        // Remove createdAt for updates as it should not change
        const { createdAt, ...updateData } = expenseData;
        await updateDoc(expenseDocRef, updateData);
        toast({ title: "Expense Updated", description: "The expense has been successfully updated." });
      } else {
        // Add new expense
        expenseData.createdAt = serverTimestamp();
        await addDoc(collection(db, "expenses"), expenseData);
        toast({ title: "Expense Added", description: "The new expense has been successfully recorded." });
      }
      setIsExpenseFormOpen(false);
      setEditingExpense(null);
      // ExpenseList uses onSnapshot, so it will update automatically
    } catch (error: any) {
      console.error("Error saving expense:", error);
      toast({
        title: "Save Failed",
        description: `Could not save expense: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    <ProtectedRoute requiredAccessLevel={3}> {/* Level 3 can view, CRUD is L1 */}
      <PageHeader
        title="Expenses Management"
        description="Track and manage all expenditures."
        actions={
          canManageExpenses && (
            <Dialog open={isExpenseFormOpen} onOpenChange={setIsExpenseFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNewExpense}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <ExpenseForm 
                  expense={editingExpense} 
                  onSave={handleSaveExpense}
                  onCancel={() => {
                    setIsExpenseFormOpen(false);
                    setEditingExpense(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          )
        }
      />
      <div className="border shadow-sm rounded-lg p-2">
        <ExpenseList onEditExpense={handleEditExpense} />
      </div>
    </ProtectedRoute>
  );
}
