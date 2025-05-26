
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import TenantForm, { type TenantFormValues } from "@/components/tenants/TenantForm";
import TenantList from "@/components/tenants/TenantList";
import { useState } from "react";
import type { Tenant } from "@/lib/types";
import { useAuth } from "@/contexts/AuthProvider";
import { useFirebase } from "@/contexts/FirebaseProvider";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, serverTimestamp, doc, updateDoc, Timestamp } from "firebase/firestore";

export default function TenantManagementPage() {
  const { userProfile } = useAuth();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [isTenantFormOpen, setIsTenantFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const canManageTenants = userProfile && userProfile.accessLevel <= 1;

  const handleAddNewTenant = () => {
    if (!canManageTenants) {
      toast({ title: "Access Denied", description: "You do not have permission to add tenants.", variant: "destructive" });
      return;
    }
    setEditingTenant(null);
    setIsTenantFormOpen(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    if (!canManageTenants) {
      toast({ title: "Access Denied", description: "You do not have permission to edit tenants.", variant: "destructive" });
      return;
    }
    setEditingTenant(tenant);
    setIsTenantFormOpen(true);
  };

  const handleSaveTenant = async (data: TenantFormValues, tenantId?: string) => {
    if (!userProfile || !canManageTenants) {
      toast({ title: "Error", description: "You do not have permission to save tenant data.", variant: "destructive" });
      return;
    }

    const tenantData: Omit<Tenant, "id" | "createdAt" | "updatedAt" | "leaseStartDate" | "leaseEndDate"> & {
      createdAt?: any;
      updatedAt?: any;
      leaseStartDate?: any;
      leaseEndDate?: any;
    } = {
      name: data.name,
      unitNumber: data.unitNumber,
      contactInfo: {
        phone: data.contactPhone,
        email: data.contactEmail,
        address: data.contactAddress,
      },
      rentAmount: data.rentAmount,
      paymentFrequency: data.paymentFrequency,
      status: data.status,
      arrearsBroughtForward: data.arrearsBroughtForward || 0,
      notes: data.notes || "",
      leaseStartDate: data.leaseStartDate ? Timestamp.fromDate(data.leaseStartDate) : null,
      leaseEndDate: data.leaseEndDate ? Timestamp.fromDate(data.leaseEndDate) : null,
    };

    try {
      if (tenantId) {
        const tenantDocRef = doc(db, "tenants", tenantId);
        tenantData.updatedAt = serverTimestamp();
        await updateDoc(tenantDocRef, tenantData);
        toast({ title: "Tenant Updated", description: `Details for ${data.name} have been updated.` });
      } else {
        tenantData.createdAt = serverTimestamp();
        tenantData.updatedAt = serverTimestamp();
        await addDoc(collection(db, "tenants"), tenantData);
        toast({ title: "Tenant Added", description: `${data.name} has been added successfully.` });
      }
      setIsTenantFormOpen(false);
      setEditingTenant(null);
    } catch (error: any) {
      console.error("Error saving tenant:", error);
      toast({
        title: "Save Failed",
        description: `Could not save tenant data: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    <ProtectedRoute requiredAccessLevel={1}> {/* Only Level 1 can access this page for CRUD */}
      <PageHeader
        title="Tenant Management"
        description="Manage tenant information, leases, and rental details."
        actions={
          canManageTenants && (
            <Dialog open={isTenantFormOpen} onOpenChange={(isOpen) => {
              setIsTenantFormOpen(isOpen);
              if (!isOpen) setEditingTenant(null);
            }}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNewTenant}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Tenant
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <TenantForm
                  tenant={editingTenant}
                  onSave={handleSaveTenant}
                  onCancel={() => {
                    setIsTenantFormOpen(false);
                    setEditingTenant(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          )
        }
      />
      <div className="border shadow-sm rounded-lg p-2">
        <TenantList onEditTenant={handleEditTenant} />
      </div>
    </ProtectedRoute>
  );
}
