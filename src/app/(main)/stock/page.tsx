
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import StockItemForm, { type StockItemFormValues } from "@/components/stock/StockItemForm";
import StockItemList from "@/components/stock/StockItemList";
import StockTransactionForm, { type StockTransactionFormValues as StockTransactionSchemaValues } from "@/components/stock/StockTransactionForm";
import StockTransactionList from "@/components/stock/StockTransactionList"; // New import
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // New import
import { useState } from "react";
import type { StockItem, StockTransaction } from "@/lib/types";
import { useAuth } from "@/contexts/AuthProvider";
import { useFirebase } from "@/contexts/FirebaseProvider";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, serverTimestamp, doc, updateDoc, runTransaction, Timestamp } from "firebase/firestore";

export default function StockManagementPage() {
  const { userProfile } = useAuth();
  const { db } = useFirebase();
  const { toast } = useToast();

  // State for Stock Item Form (Add/Edit)
  const [isStockItemFormOpen, setIsStockItemFormOpen] = useState(false);
  const [editingStockItem, setEditingStockItem] = useState<StockItem | null>(null);

  // State for Stock Transaction Form
  const [isStockTransactionFormOpen, setIsStockTransactionFormOpen] = useState(false);
  const [currentItemForTransaction, setCurrentItemForTransaction] = useState<StockItem | null>(null);
  const [currentTransactionType, setCurrentTransactionType] = useState<'IN' | 'OUT'>('IN');


  const canManageStock = userProfile && userProfile.accessLevel <= 1;

  // Stock Item Form Handlers
  const handleAddNewStockItem = () => {
    if (!canManageStock) {
      toast({ title: "Access Denied", description: "You do not have permission to add stock items.", variant: "destructive" });
      return;
    }
    setEditingStockItem(null);
    setIsStockItemFormOpen(true);
  };

  const handleEditStockItem = (item: StockItem) => {
    if (!canManageStock) {
      toast({ title: "Access Denied", description: "You do not have permission to edit stock items.", variant: "destructive" });
      return;
    }
    setEditingStockItem(item);
    setIsStockItemFormOpen(true);
  };

  const handleSaveStockItem = async (data: StockItemFormValues, itemId?: string) => {
    if (!userProfile || !canManageStock) {
      toast({ title: "Error", description: "You do not have permission to save stock items.", variant: "destructive" });
      return;
    }
    const stockItemData: Omit<StockItem, "id" | "createdAt" | "updatedAt" | "currentQuantity"> & {
      createdAt?: any;
      updatedAt?: any;
      currentQuantity: number;
    } = {
      itemName: data.itemName,
      description: data.description || "",
      unitOfMeasure: data.unitOfMeasure,
      currentQuantity: itemId ? (editingStockItem?.currentQuantity || 0) : (data.initialQuantity || 0),
      lowStockThreshold: data.lowStockThreshold,
    };

    try {
      if (itemId) {
        const itemDocRef = doc(db, "stockItems", itemId);
        stockItemData.updatedAt = serverTimestamp();
        const {currentQuantity, ...updateData} = stockItemData; 
        await updateDoc(itemDocRef, {...updateData});
        toast({ title: "Stock Item Updated", description: `"${data.itemName}" has been successfully updated.` });
      } else {
        stockItemData.createdAt = serverTimestamp();
        stockItemData.updatedAt = serverTimestamp();
        await addDoc(collection(db, "stockItems"), stockItemData);
        toast({ title: "Stock Item Added", description: `"${data.itemName}" has been successfully added.` });
      }
      setIsStockItemFormOpen(false);
      setEditingStockItem(null);
    } catch (error: any) {
      console.error("Error saving stock item:", error);
      toast({ title: "Save Failed", description: `Could not save stock item: ${error.message}`, variant: "destructive" });
    }
  };

  // Stock Transaction Form Handlers
  const handleOpenStockInDialog = (item: StockItem) => {
    if (!canManageStock) return;
    setCurrentItemForTransaction(item);
    setCurrentTransactionType('IN');
    setIsStockTransactionFormOpen(true);
  };

  const handleOpenStockOutDialog = (item: StockItem) => {
    if (!canManageStock) return;
    setCurrentItemForTransaction(item);
    setCurrentTransactionType('OUT');
    setIsStockTransactionFormOpen(true);
  };
  
  const handleSaveStockTransaction = async (
    data: StockTransactionSchemaValues, 
    itemId: string,
    currentItem: StockItem
  ) => {
    if (!userProfile || !canManageStock || !itemId) {
      toast({ title: "Error", description: "Permission denied or item ID missing.", variant: "destructive" });
      return;
    }

    const transactionDate = data.date instanceof Date ? Timestamp.fromDate(data.date) : data.date;
    let newQuantity = currentItem.currentQuantity;

    if (currentTransactionType === 'IN') {
      newQuantity += data.quantity;
    } else { // 'OUT'
      if (data.quantity > currentItem.currentQuantity) {
        toast({ title: "Insufficient Stock", description: `Cannot disburse ${data.quantity} ${currentItem.unitOfMeasure}. Only ${currentItem.currentQuantity} available.`, variant: "destructive", duration: 5000 });
        return;
      }
      newQuantity -= data.quantity;
    }

    const transactionData: Omit<StockTransaction, "id" | "createdAt" | "date"> & { createdAt?: any; date: any } = {
      itemId: itemId,
      itemName: currentItem.itemName,
      transactionType: currentTransactionType,
      date: transactionDate,
      quantity: data.quantity,
      unitCost: currentTransactionType === 'IN' ? data.unitCost : undefined,
      supplier: currentTransactionType === 'IN' ? data.supplier : undefined,
      issuedTo: currentTransactionType === 'OUT' ? data.issuedTo : undefined,
      notes: data.notes || "",
      recordedByUid: userProfile.uid,
      recordedByName: userProfile.name || "Unknown User",
      createdAt: serverTimestamp(),
    };
    
    try {
      await runTransaction(db, async (transaction) => {
        const stockItemRef = doc(db, "stockItems", itemId);
        // Note: When setting a new document in a transaction, it's often `transaction.set(doc(collectionRef, newId), data)`
        // or `transaction.set(doc(collectionRef), data)` if you want Firestore to auto-generate the ID.
        // For simplicity, and if `stockTransactions` IDs aren't critical for immediate client-side use after creation:
        transaction.set(doc(collection(db, "stockTransactions")), transactionData);
        transaction.update(stockItemRef, { currentQuantity: newQuantity, updatedAt: serverTimestamp() });
      });

      toast({ title: `Stock ${currentTransactionType} Recorded`, description: `${data.quantity} ${currentItem.unitOfMeasure} of ${currentItem.itemName} transacted.` });
      setIsStockTransactionFormOpen(false);
      setCurrentItemForTransaction(null);
    } catch (error: any) {
      console.error(`Error recording stock ${currentTransactionType} transaction:`, error);
      toast({ title: "Transaction Failed", description: error.message, variant: "destructive" });
    }
  };


  return (
    <ProtectedRoute requiredAccessLevel={3}>
      <PageHeader
        title="Stock Management"
        description="Track and manage inventory items and their movements."
        actions={
          canManageStock && (
            <Dialog open={isStockItemFormOpen} onOpenChange={(isOpen) => {
              setIsStockItemFormOpen(isOpen);
              if (!isOpen) setEditingStockItem(null);
            }}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNewStockItem}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Stock Item
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <StockItemForm
                  stockItem={editingStockItem}
                  onSave={handleSaveStockItem}
                  onCancel={() => {
                    setIsStockItemFormOpen(false);
                    setEditingStockItem(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          )
        }
      />
      <Tabs defaultValue="stock-items" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="stock-items">Stock Items</TabsTrigger>
          <TabsTrigger value="transaction-history">Transaction History</TabsTrigger>
        </TabsList>
        <TabsContent value="stock-items" className="mt-6">
          <div className="border shadow-sm rounded-lg p-2">
            <StockItemList
              onEditStockItem={handleEditStockItem}
              onRecordStockIn={handleOpenStockInDialog}
              onRecordStockOut={handleOpenStockOutDialog}
            />
          </div>
        </TabsContent>
        <TabsContent value="transaction-history" className="mt-6">
          <div className="border shadow-sm rounded-lg p-2">
            <StockTransactionList />
          </div>
        </TabsContent>
      </Tabs>


      {/* Dialog for Stock Transaction Form */}
      {currentItemForTransaction && (
         <Dialog open={isStockTransactionFormOpen} onOpenChange={(isOpen) => {
            setIsStockTransactionFormOpen(isOpen);
            if (!isOpen) setCurrentItemForTransaction(null);
          }}>
          <DialogContent className="sm:max-w-[525px]">
            <StockTransactionForm
              stockItem={currentItemForTransaction}
              transactionType={currentTransactionType}
              onSave={handleSaveStockTransaction}
              onCancel={() => {
                setIsStockTransactionFormOpen(false);
                setCurrentItemForTransaction(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </ProtectedRoute>
  );
}

