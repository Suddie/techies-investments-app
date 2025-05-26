
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import TenantForm, { type TenantFormValues } from "@/components/tenants/TenantForm";
import TenantList from "@/components/tenants/TenantList";
import RentInvoiceForm, { type RentInvoiceFormValues } from "@/components/tenants/RentInvoiceForm"; 
import RentInvoiceList from "@/components/tenants/RentInvoiceList"; // New Import
import { useState } from "react";
import type { Tenant, RentInvoice } from "@/lib/types"; 
import { useAuth } from "@/contexts/AuthProvider";
import { useFirebase } from "@/contexts/FirebaseProvider";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, serverTimestamp, doc, updateDoc, Timestamp } from "firebase/firestore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 

export default function TenantManagementPage() {
  const { userProfile } = useAuth();
  const { db } = useFirebase();
  const { toast } = useToast();

  // State for Tenant Form
  const [isTenantFormOpen, setIsTenantFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  // State for Rent Invoice Form
  const [isRentInvoiceFormOpen, setIsRentInvoiceFormOpen] = useState(false);
  const [tenantForInvoice, setTenantForInvoice] = useState<Tenant | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<RentInvoice | null>(null); // For editing invoices later

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

  // Invoice Handlers
  const handleCreateInvoiceForTenant = (tenant: Tenant) => {
    if (!canManageTenants) {
      toast({ title: "Access Denied", description: "You do not have permission to create invoices.", variant: "destructive" });
      return;
    }
    setTenantForInvoice(tenant);
    setEditingInvoice(null); // For new invoice
    setIsRentInvoiceFormOpen(true);
  };

  const handleSaveRentInvoice = async (data: RentInvoiceFormValues, invoiceId?: string) => {
     if (!userProfile || !canManageTenants || !tenantForInvoice) {
      toast({ title: "Error", description: "Permission denied or tenant data missing.", variant: "destructive" });
      return;
    }

    const totalDue = data.rentAmount + (data.arrearsBroughtForward || 0); // Basic calculation

    const invoiceData: Omit<RentInvoice, "id" | "createdAt" | "updatedAt" | "invoiceDate" | "dueDate" | "periodCoveredStart" | "periodCoveredEnd" | "datePaid"> & {
      createdAt?: any; updatedAt?: any; invoiceDate: any; dueDate: any; periodCoveredStart: any; periodCoveredEnd: any; datePaid?:any;
    } = {
      tenantId: tenantForInvoice.id!,
      tenantName: tenantForInvoice.name,
      unitNumber: tenantForInvoice.unitNumber,
      invoiceNumber: `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`, // Simple unique enough number
      invoiceDate: Timestamp.fromDate(data.invoiceDate),
      dueDate: Timestamp.fromDate(data.dueDate),
      periodCoveredStart: Timestamp.fromDate(data.periodCoveredStart),
      periodCoveredEnd: Timestamp.fromDate(data.periodCoveredEnd),
      rentAmount: data.rentAmount,
      arrearsBroughtForward: data.arrearsBroughtForward || 0,
      totalDue: totalDue,
      amountPaid: 0, // Initially unpaid
      status: 'Draft',
      notes: data.notes || "",
      createdByUid: userProfile.uid,
      createdByName: userProfile.name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    try {
      if (invoiceId) {
        // Update existing invoice
        const invoiceDocRef = doc(db, "rentInvoices", invoiceId);
        // Ensure fields like createdAt are not overwritten on update
        const { createdAt, createdByUid, createdByName, tenantId, tenantName, unitNumber, invoiceNumber, ...updateData} = invoiceData;
        updateData.updatedAt = serverTimestamp();
        await updateDoc(invoiceDocRef, updateData);
        toast({ title: "Invoice Updated", description: `Invoice ${invoiceData.invoiceNumber} has been updated.`});
      } else {
        // Add new invoice
        await addDoc(collection(db, "rentInvoices"), invoiceData);
        toast({ title: "Invoice Created", description: `Invoice ${invoiceData.invoiceNumber} for ${tenantForInvoice.name} created.`});
      }
      setIsRentInvoiceFormOpen(false);
      setEditingInvoice(null);
      setTenantForInvoice(null);
    } catch (error: any) {
      console.error("Error saving rent invoice:", error);
      toast({ title: "Invoice Save Failed", description: error.message, variant: "destructive"});
    }
  };


  return (
    <ProtectedRoute requiredAccessLevel={1}>
      <PageHeader
        title="Tenant Management"
        description="Manage tenant information, leases, and rental details. Create and track rent invoices."
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
      <Tabs defaultValue="tenants" className="w-full mt-6">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="invoices">Rent Invoices</TabsTrigger>
        </TabsList>
        <TabsContent value="tenants">
          <div className="border shadow-sm rounded-lg p-2 mt-4">
            <TenantList 
                onEditTenant={handleEditTenant} 
                onCreateInvoice={handleCreateInvoiceForTenant}
            />
          </div>
        </TabsContent>
        <TabsContent value="invoices">
           <div className="border shadow-sm rounded-lg p-2 mt-4">
             <RentInvoiceList />
          </div>
        </TabsContent>
      </Tabs>


      {/* Rent Invoice Form Dialog */}
      {tenantForInvoice && (
        <Dialog open={isRentInvoiceFormOpen} onOpenChange={(isOpen) => {
            setIsRentInvoiceFormOpen(isOpen);
            if (!isOpen) {
                setTenantForInvoice(null);
                setEditingInvoice(null);
            }
        }}>
          <DialogContent className="sm:max-w-lg">
            <RentInvoiceForm
              tenant={tenantForInvoice}
              invoice={editingInvoice}
              onSave={handleSaveRentInvoice}
              onCancel={() => {
                setIsRentInvoiceFormOpen(false);
                setTenantForInvoice(null);
                setEditingInvoice(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </ProtectedRoute>
  );
}
