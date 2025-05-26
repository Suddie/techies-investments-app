
"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Professional } from '@/lib/types';
import { useAuth } from '@/contexts/AuthProvider';
import { useSettings } from '@/contexts/SettingsProvider';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit2, Trash2, Phone, Mail, Briefcase } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProfessionalListProps {
  onEditProfessional: (professional: Professional) => void;
  // onRecordPayment: (professional: Professional) => void; // To be added later
}

export default function ProfessionalList({ onEditProfessional }: ProfessionalListProps) {
  const { userProfile, loading: authLoading } = useAuth();
  const { settings } = useSettings();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [professionalToDelete, setProfessionalToDelete] = useState<Professional | null>(null);

  const canManageProfessionals = userProfile && userProfile.accessLevel <= 1;

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!userProfile) { // If not authenticated or profile not loaded, don't fetch
      setLoading(false);
      setProfessionals([]);
      return;
    }

    setLoading(true);
    const professionalsRef = collection(db, "professionals");
    const q = query(professionalsRef, orderBy("name", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedProfessionals: Professional[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedProfessionals.push({
          id: docSnap.id,
          ...data,
          // Ensure nested objects and arrays are correctly typed or defaulted
          contactInfo: data.contactInfo || {},
          paymentHistory: data.paymentHistory || [],
          // Timestamps
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
        } as Professional);
      });
      setProfessionals(fetchedProfessionals);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching professionals:", err);
      toast({
        title: "Error Fetching Professionals",
        description: `Could not load professional data: ${err.message}. Check Firestore permissions.`,
        variant: "destructive",
        duration: 7000,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, toast, userProfile, authLoading]);

  const handleDeleteProfessional = async () => {
    if (!professionalToDelete || !professionalToDelete.id || !canManageProfessionals) {
      toast({ title: "Error", description: "Cannot delete professional or insufficient permissions.", variant: "destructive" });
      setProfessionalToDelete(null);
      return;
    }
    try {
      await deleteDoc(doc(db, "professionals", professionalToDelete.id));
      toast({ title: "Professional Deleted", description: `Record for "${professionalToDelete.name}" has been removed.` });
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    } finally {
      setProfessionalToDelete(null);
    }
  };

  const getStatusBadgeClass = (status: Professional['status']): string => {
    switch (status) {
      case 'Active':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-800/50 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'On Hold':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
      case 'Completed':
        return 'bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300 border-green-300 dark:border-green-700';
      case 'Terminated':
        return 'bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300 border-red-300 dark:border-red-700';
      default:
        return 'border-gray-400 text-gray-600 dark:border-gray-600 dark:text-gray-400';
    }
  };

  if (loading || authLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>{authLoading ? "Authenticating..." : "Loading Professionals Data..."}</CardTitle></CardHeader>
        <CardContent className="space-y-3 p-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
        </CardContent>
      </Card>
    );
  }
  
  if (!userProfile) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>Please log in to view professional data.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (professionals.length === 0 && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Professionals Found</CardTitle>
          <CardDescription>Users with Level 1 access can add new professionals or laborers.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
            No professional records yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registered Professionals & Laborers</CardTitle>
        <CardDescription>Manage contact information, service details, and payment status.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Service Type</TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead className="text-right">Agreed Charge ({settings.currencySymbol})</TableHead>
              <TableHead className="text-right">Balance Due ({settings.currencySymbol})</TableHead>
              <TableHead>Status</TableHead>
              {canManageProfessionals && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {professionals.map((prof) => (
              <TableRow key={prof.id}>
                <TableCell className="font-medium">{prof.name}</TableCell>
                <TableCell>{prof.serviceType}</TableCell>
                <TableCell className="hidden md:table-cell text-xs">
                  {prof.contactInfo?.phone && <div className="flex items-center"><Phone className="mr-1.5 h-3 w-3 text-muted-foreground" /> {prof.contactInfo.phone}</div>}
                  {prof.contactInfo?.email && <div className="flex items-center"><Mail className="mr-1.5 h-3 w-3 text-muted-foreground" /> {prof.contactInfo.email}</div>}
                  {!prof.contactInfo?.phone && !prof.contactInfo?.email && <span className="text-muted-foreground/70">-</span>}
                </TableCell>
                <TableCell className="text-right">
                  {prof.totalAgreedCharge.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {prof.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusBadgeClass(prof.status)}>{prof.status}</Badge>
                </TableCell>
                {canManageProfessionals && (
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
                          <DropdownMenuItem onClick={() => onEditProfessional(prof)}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit Details
                          </DropdownMenuItem>
                          {/* 
                          <DropdownMenuItem onClick={() => onRecordPayment?.(prof)}> // To be implemented
                            <DollarSign className="mr-2 h-4 w-4" /> Record Payment
                          </DropdownMenuItem>
                          */}
                          <DropdownMenuSeparator />
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => setProfessionalToDelete(prof)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Record
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the record for "{professionalToDelete?.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setProfessionalToDelete(null)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteProfessional}>Delete</AlertDialogAction>
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
