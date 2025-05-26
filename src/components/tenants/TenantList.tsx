
"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Tenant } from '@/lib/types';
import { useAuth } from '@/contexts/AuthProvider';
import { useSettings } from '@/contexts/SettingsProvider';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit2, Trash2, Phone, Mail } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Corrected import path

interface TenantListProps {
  onEditTenant: (tenant: Tenant) => void;
}

export default function TenantList({ onEditTenant }: TenantListProps) {
  const { userProfile } = useAuth();
  const { settings } = useSettings();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);

  const canManageTenants = userProfile && userProfile.accessLevel <= 1;

  useEffect(() => {
    if (!userProfile) { // Wait for userProfile to be available
      setLoading(false); // Not strictly loading tenants yet
      setTenants([]); // Ensure tenants list is empty if no profile
      return;
    }

    setLoading(true);
    const tenantsRef = collection(db, "tenants");
    const q = query(tenantsRef, orderBy("name", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedTenants: Tenant[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedTenants.push({
          id: docSnap.id,
          ...data,
          leaseStartDate: data.leaseStartDate instanceof Timestamp ? data.leaseStartDate.toDate() : (data.leaseStartDate ? new Date(data.leaseStartDate) : undefined),
          leaseEndDate: data.leaseEndDate instanceof Timestamp ? data.leaseEndDate.toDate() : (data.leaseEndDate ? new Date(data.leaseEndDate) : undefined),
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
        } as Tenant);
      });
      setTenants(fetchedTenants);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching tenants:", err);
      toast({
        title: "Error Fetching Tenants",
        description: `Could not load tenants: ${err.message}. Check Firestore permissions for 'tenants'.`,
        variant: "destructive",
        duration: 7000,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, toast, userProfile]); // Added userProfile to dependency array

  const handleDeleteTenant = async () => {
    if (!tenantToDelete || !tenantToDelete.id || !canManageTenants) {
      toast({ title: "Error", description: "Cannot delete tenant or insufficient permissions.", variant: "destructive" });
      setTenantToDelete(null);
      return;
    }
    try {
      await deleteDoc(doc(db, "tenants", tenantToDelete.id));
      toast({ title: "Tenant Deleted", description: `Tenant "${tenantToDelete.name}" has been removed.` });
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    } finally {
      setTenantToDelete(null);
    }
  };

  const getStatusBadgeClass = (status: Tenant['status']): string => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300 border-green-300 dark:border-green-700';
      case 'Inactive':
        return 'bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300 border-red-300 dark:border-red-700';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
      default:
        return 'border-gray-400 text-gray-600 dark:border-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Loading Tenant Data...</CardTitle></CardHeader>
        <CardContent className="space-y-3 p-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
        </CardContent>
      </Card>
    );
  }

  if (!userProfile && !loading) { // Handle case where userProfile is still null after initial load attempt
    return (
        <Card>
            <CardHeader>
                <CardTitle>Tenant Management</CardTitle>
                <CardDescription>Authenticating user...</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground py-8">
                    Please wait or ensure you are logged in with appropriate permissions.
                </p>
            </CardContent>
        </Card>
    );
  }
  
  if (tenants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tenant Management</CardTitle>
          <CardDescription>No tenants found.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Users with Level 1 access can add new tenants.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenant Roster</CardTitle>
        <CardDescription>Overview of all current and past tenants.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead className="text-right">Rent ({settings.currencySymbol})</TableHead>
              <TableHead className="hidden sm:table-cell">Lease End</TableHead>
              <TableHead>Status</TableHead>
              {canManageTenants && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-medium">{tenant.name}</TableCell>
                <TableCell>{tenant.unitNumber}</TableCell>
                <TableCell className="hidden md:table-cell text-xs">
                  {tenant.contactInfo?.phone && <div className="flex items-center"><Phone className="mr-1.5 h-3 w-3 text-muted-foreground" /> {tenant.contactInfo.phone}</div>}
                  {tenant.contactInfo?.email && <div className="flex items-center"><Mail className="mr-1.5 h-3 w-3 text-muted-foreground" /> {tenant.contactInfo.email}</div>}
                  {!tenant.contactInfo?.phone && !tenant.contactInfo?.email && <span className="text-muted-foreground/70">-</span>}
                </TableCell>
                <TableCell className="text-right">
                  {tenant.rentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {tenant.leaseEndDate ? format(new Date(tenant.leaseEndDate), "PP") : <span className="text-muted-foreground/70">-</span>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusBadgeClass(tenant.status)}>{tenant.status}</Badge>
                </TableCell>
                {canManageTenants && (
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
                          <DropdownMenuItem onClick={() => onEditTenant(tenant)}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => setTenantToDelete(tenant)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete tenant "{tenantToDelete?.name}" and all related data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setTenantToDelete(null)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteTenant}>Delete</AlertDialogAction>
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

