
"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { StockItem } from '@/lib/types';
import { useAuth } from '@/contexts/AuthProvider';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit2, Trash2, AlertTriangle } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface StockItemListProps {
  onEditStockItem: (item: StockItem) => void;
}

export default function StockItemList({ onEditStockItem }: StockItemListProps) {
  const { userProfile } = useAuth();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);

  const canManageStock = userProfile && userProfile.accessLevel <= 1;

  useEffect(() => {
    setLoading(true);
    const stockItemsRef = collection(db, "stockItems");
    const q = query(stockItemsRef, orderBy("itemName", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedItems: StockItem[] = [];
      querySnapshot.forEach((doc) => {
        fetchedItems.push({ id: doc.id, ...doc.data() } as StockItem);
      });
      setStockItems(fetchedItems);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching stock items:", err);
      toast({
        title: "Error Fetching Stock Items",
        description: `Could not load stock items: ${err.message}. Check Firestore permissions.`,
        variant: "destructive",
        duration: 7000,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, toast]);

  const handleDeleteStockItem = async () => {
    if (!itemToDelete || !itemToDelete.id || !canManageStock) {
      toast({ title: "Error", description: "Cannot delete item or insufficient permissions.", variant: "destructive" });
      setItemToDelete(null);
      return;
    }
    try {
      // Note: Deleting a stock item should ideally check if it's used in transactions.
      // For now, it's a direct delete.
      await deleteDoc(doc(db, "stockItems", itemToDelete.id));
      toast({ title: "Stock Item Deleted", description: `"${itemToDelete.itemName}" has been removed.` });
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    } finally {
      setItemToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
      </div>
    );
  }

  if (stockItems.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No stock items found. Level 1 users can add new items.
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item Name</TableHead>
            <TableHead className="hidden md:table-cell">Description</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead className="text-right">Current Qty</TableHead>
            <TableHead className="text-right">Low Stock At</TableHead>
            {canManageStock && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {stockItems.map((item) => (
            <TableRow key={item.id} className={item.currentQuantity <= item.lowStockThreshold ? "bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-800/40" : ""}>
              <TableCell className="font-medium">
                {item.currentQuantity <= item.lowStockThreshold && (
                   <AlertTriangle className="h-4 w-4 mr-1.5 text-yellow-500 inline-block" />
                )}
                {item.itemName}
              </TableCell>
              <TableCell className="hidden md:table-cell max-w-xs truncate" title={item.description}>
                {item.description || <span className="text-muted-foreground/70">-</span>}
              </TableCell>
              <TableCell>
                <Badge variant={"outline"}>{item.unitOfMeasure}</Badge>
              </TableCell>
              <TableCell className="text-right font-semibold">
                {item.currentQuantity.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {item.lowStockThreshold.toLocaleString()}
              </TableCell>
              {canManageStock && (
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
                        <DropdownMenuItem onClick={() => onEditStockItem(item)}>
                          <Edit2 className="mr-2 h-4 w-4" /> Edit Item
                        </DropdownMenuItem>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => setItemToDelete(item)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Item
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the stock item
                          "{itemToDelete?.itemName}". Consider impacts on historical stock transactions.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteStockItem}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
