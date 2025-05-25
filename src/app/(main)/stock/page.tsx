
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import StockItemForm, { type StockItemFormValues } from "@/components/stock/StockItemForm";
import StockItemList from "@/components/stock/StockItemList";
import { useState } from "react";
import type { StockItem } from "@/lib/types";
import { useAuth } from "@/contexts/AuthProvider";
import { useFirebase } from "@/contexts/FirebaseProvider";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";

export default function StockManagementPage() {
  const { userProfile } = useAuth();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [isStockItemFormOpen, setIsStockItemFormOpen] = useState(false);
  const [editingStockItem, setEditingStockItem] = useState<StockItem | null>(null);

  const canManageStock = userProfile && userProfile.accessLevel <= 1; // Level 1 can CRUD

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
      currentQuantity: itemId ? (editingStockItem?.currentQuantity || 0) : (data.initialQuantity || 0), // Preserve current quantity on edit, use initial on create
      lowStockThreshold: data.lowStockThreshold,
    };

    try {
      if (itemId) {
        // Update existing stock item
        const itemDocRef = doc(db, "stockItems", itemId);
        stockItemData.updatedAt = serverTimestamp();
        // currentQuantity is not directly editable on the form for existing items, it's managed by transactions.
        // However, if we were to allow editing it here, it would be:
        // await updateDoc(itemDocRef, { ...stockItemData, currentQuantity: data.currentQuantity });
        // For now, we are not making currentQuantity directly editable for existing items via this form.
        // We only update other fields.
        const {currentQuantity, ...updateData} = stockItemData; 
        await updateDoc(itemDocRef, {...updateData});


        toast({ title: "Stock Item Updated", description: `"${data.itemName}" has been successfully updated.` });
      } else {
        // Add new stock item
        stockItemData.createdAt = serverTimestamp();
        stockItemData.updatedAt = serverTimestamp();
        await addDoc(collection(db, "stockItems"), stockItemData);
        toast({ title: "Stock Item Added", description: `"${data.itemName}" has been successfully added.` });
      }
      setIsStockItemFormOpen(false);
      setEditingStockItem(null);
    } catch (error: any) {
      console.error("Error saving stock item:", error);
      toast({
        title: "Save Failed",
        description: `Could not save stock item: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    <ProtectedRoute requiredAccessLevel={3}> {/* Level 3 can view, CRUD is L1 */}
      <PageHeader
        title="Stock Management"
        description="Track and manage inventory items."
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
      <div className="border shadow-sm rounded-lg p-2">
        <StockItemList
          onEditStockItem={handleEditStockItem}
        />
      </div>
    </ProtectedRoute>
  );
}
