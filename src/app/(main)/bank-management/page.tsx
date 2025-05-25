
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import BankBalanceList from "@/components/bank/BankBalanceList";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import BankBalanceForm, { type BankBalanceFormValues } from "@/components/bank/BankBalanceForm";
import { useState } from "react";
import type { BankBalance } from "@/lib/types";
import { useAuth } from "@/contexts/AuthProvider";
import { useFirebase } from "@/contexts/FirebaseProvider";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";

export default function BankManagementPage() {
  const { userProfile } = useAuth();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBalance, setEditingBalance] = useState<BankBalance | null>(null);

  const canManageBankBalances = userProfile && userProfile.accessLevel <= 1;

  const handleAddNewBalance = () => {
    if (!canManageBankBalances) {
      toast({ title: "Access Denied", description: "You do not have permission to add bank balances.", variant: "destructive"});
      return;
    }
    setEditingBalance(null);
    setIsFormOpen(true);
  };

  const handleEditBalance = (balance: BankBalance) => {
    if (!canManageBankBalances) {
      toast({ title: "Access Denied", description: "You do not have permission to edit bank balances.", variant: "destructive"});
      return;
    }
    setEditingBalance(balance);
    setIsFormOpen(true);
  };

  const handleSaveBalance = async (data: BankBalanceFormValues, balanceId?: string) => {
    if (!userProfile || !canManageBankBalances) {
      toast({ title: "Error", description: "You do not have permission to save bank balances.", variant: "destructive" });
      return;
    }

    const balanceData: Omit<BankBalance, "id" | "lastUpdated" | "recordedByUid" | "recordedByName"> & {
      lastUpdated?: any;
      recordedByUid?: string;
      recordedByName?: string;
    } = {
      monthYear: data.monthYear,
      openingBalance: data.openingBalance,
      closingBalance: data.closingBalance,
      interestEarned: data.interestEarned ?? 0, // Default to 0 if undefined
      bankCharges: data.bankCharges ?? 0, // Default to 0 if undefined
      lastUpdated: serverTimestamp(),
      recordedByUid: userProfile.uid,
      recordedByName: userProfile.name || "Unknown User",
    };

    try {
      if (balanceId) {
        const balanceDocRef = doc(db, "bankBalances", balanceId);
        await updateDoc(balanceDocRef, balanceData);
        toast({ title: "Bank Balance Updated", description: `Balance for ${data.monthYear} has been updated.` });
      } else {
        // Check if a record for this monthYear already exists before adding
        // This check can be done more robustly with Firestore rules or Cloud Functions
        // For now, we'll rely on admin diligence or add a client-side check if needed.
        await addDoc(collection(db, "bankBalances"), balanceData);
        toast({ title: "Bank Balance Added", description: `Balance for ${data.monthYear} has been added.` });
      }
      setIsFormOpen(false);
      setEditingBalance(null);
    } catch (error: any) {
      console.error("Error saving bank balance:", error);
      toast({
        title: "Save Failed",
        description: `Could not save bank balance: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    <ProtectedRoute requiredAccessLevel={2}> {/* Level 2 can view, CRUD is L1 */}
      <PageHeader
        title="Bank Balances Management"
        description="Track and manage monthly bank balances, interest, and charges."
        actions={
          canManageBankBalances && (
            <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
                setIsFormOpen(isOpen);
                if (!isOpen) setEditingBalance(null);
            }}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNewBalance}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Monthly Balance
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <BankBalanceForm
                  balance={editingBalance}
                  onSave={handleSaveBalance}
                  onCancel={() => {
                    setIsFormOpen(false);
                    setEditingBalance(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          )
        }
      />
      <div className="border shadow-sm rounded-lg p-2">
        <BankBalanceList 
          onEditBalance={handleEditBalance} 
        />
      </div>
    </ProtectedRoute>
  );
}
