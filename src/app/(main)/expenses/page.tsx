
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
// Import Dialog components when ExpenseForm is ready
// import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
// import ExpenseForm from "@/components/expenses/ExpenseForm";
import { useState } from "react";
// Import ExpenseList when ready
// import ExpenseList from "@/components/expenses/ExpenseList";

export default function ExpensesPage() {
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  // const [editingExpense, setEditingExpense] = useState<Expense | null>(null); // Uncomment when types are ready

  const handleAddNewExpense = () => {
    // setEditingExpense(null); // Uncomment when form is ready
    setIsExpenseFormOpen(true);
  };

  // const handleEditExpense = (expense: Expense) => { // Uncomment when types and form are ready
  //   setEditingExpense(expense);
  //   setIsExpenseFormOpen(true);
  // };

  // const handleSaveExpense = async (data: any, expenseId?: string) => { // Uncomment when form logic is ready
  //   console.log("Saving expense:", data, expenseId);
  //   // Add Firestore logic here
  //   setIsExpenseFormOpen(false);
  // };

  return (
    <ProtectedRoute requiredAccessLevel={3}> {/* Level 3 can view, CRUD is L1 */}
      <PageHeader
        title="Expenses Management"
        description="Track and manage all expenditures."
        actions={
          <Button onClick={handleAddNewExpense} disabled> {/* TODO: Enable when form is ready */}
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Expense
          </Button>
          /* <Dialog open={isExpenseFormOpen} onOpenChange={setIsExpenseFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNewExpense}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <ExpenseForm 
                expense={editingExpense} 
                onSave={handleSaveExpense} // Implement this
                onCancel={() => {
                  setIsExpenseFormOpen(false);
                  setEditingExpense(null);
                }}
              />
            </DialogContent>
          </Dialog> */
        }
      />
      <div className="border shadow-sm rounded-lg p-2">
        {/* <ExpenseList onEditExpense={handleEditExpense} /> Placeholder for expense list */}
        <p className="text-center text-muted-foreground py-8">
          Expense list and form will be implemented here.
        </p>
      </div>
    </ProtectedRoute>
  );
}
