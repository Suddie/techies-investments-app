
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ProfessionalForm, { type ProfessionalFormValues } from "@/components/professionals/ProfessionalForm";
import ProfessionalList from "@/components/professionals/ProfessionalList";
import { useState } from "react";
import type { Professional } from "@/lib/types";
import { useAuth } from "@/contexts/AuthProvider";
import { useFirebase } from "@/contexts/FirebaseProvider";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";

export default function ProfessionalsPage() {
  const { userProfile } = useAuth();
  const { db } = useFirebase();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);

  const canManageProfessionals = userProfile && userProfile.accessLevel <= 1;

  const handleAddNewProfessional = () => {
    if (!canManageProfessionals) {
      toast({ title: "Access Denied", description: "You do not have permission to add professionals.", variant: "destructive" });
      return;
    }
    setEditingProfessional(null);
    setIsFormOpen(true);
  };

  const handleEditProfessional = (professional: Professional) => {
    if (!canManageProfessionals) {
      toast({ title: "Access Denied", description: "You do not have permission to edit professionals.", variant: "destructive" });
      return;
    }
    setEditingProfessional(professional);
    setIsFormOpen(true);
  };

  const handleSaveProfessional = async (data: ProfessionalFormValues, professionalId?: string) => {
    if (!userProfile || !canManageProfessionals) {
      toast({ title: "Error", description: "You do not have permission to save professional data.", variant: "destructive" });
      return;
    }

    const professionalData: Omit<Professional, "id" | "createdAt" | "updatedAt" | "paymentHistory" | "balanceDue"> & {
      createdAt?: any;
      updatedAt?: any;
      paymentHistory: []; // Initialize empty payment history
      balanceDue: number;  // Initially, balance due is the total agreed charge
    } = {
      name: data.name,
      serviceType: data.serviceType,
      contactInfo: {
        phone: data.contactPhone || "",
        email: data.contactEmail || "",
      },
      assignedJobDescription: data.assignedJobDescription || "",
      totalAgreedCharge: data.totalAgreedCharge,
      status: data.status,
      paymentHistory: [], // New professionals start with no payment history
      balanceDue: data.totalAgreedCharge, // Initially balance due is full agreed charge
    };

    try {
      if (professionalId) {
        const professionalDocRef = doc(db, "professionals", professionalId);
        professionalData.updatedAt = serverTimestamp();
        // When editing, retain existing paymentHistory and recalculate balanceDue if totalAgreedCharge changes
        // For simplicity now, we are not re-calculating balance due on edit of totalAgreedCharge based on existing payments
        // A more robust solution would re-evaluate balanceDue if totalAgreedCharge changes and payments exist.
        const existingDoc = await professionalDocRef.get();
        const existingData = existingDoc.data() as Professional | undefined;
        if (existingData) {
             professionalData.paymentHistory = existingData.paymentHistory; // Keep existing payments
             professionalData.balanceDue = data.totalAgreedCharge - (existingData.paymentHistory?.reduce((sum, p) => sum + p.amountPaid, 0) || 0);
        }

        await updateDoc(professionalDocRef, {
            name: professionalData.name,
            serviceType: professionalData.serviceType,
            contactInfo: professionalData.contactInfo,
            assignedJobDescription: professionalData.assignedJobDescription,
            totalAgreedCharge: professionalData.totalAgreedCharge,
            status: professionalData.status,
            balanceDue: professionalData.balanceDue, // update balanceDue
            // paymentHistory is not directly updated here; it's updated via a separate payment recording mechanism.
            updatedAt: serverTimestamp(),
        });
        toast({ title: "Professional Updated", description: `Details for ${data.name} have been updated.` });
      } else {
        professionalData.createdAt = serverTimestamp();
        professionalData.updatedAt = serverTimestamp();
        await addDoc(collection(db, "professionals"), professionalData);
        toast({ title: "Professional Added", description: `${data.name} has been added successfully.` });
      }
      setIsFormOpen(false);
      setEditingProfessional(null);
    } catch (error: any) {
      console.error("Error saving professional:", error);
      toast({
        title: "Save Failed",
        description: `Could not save professional data: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    <ProtectedRoute requiredAccessLevel={1}>
      <PageHeader
        title="Professional & Labor Management"
        description="Manage records of professionals, contractors, and laborers engaged for projects."
        actions={
          canManageProfessionals && (
            <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
              setIsFormOpen(isOpen);
              if (!isOpen) setEditingProfessional(null);
            }}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNewProfessional}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Professional
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <ProfessionalForm
                  professional={editingProfessional}
                  onSave={handleSaveProfessional}
                  onCancel={() => {
                    setIsFormOpen(false);
                    setEditingProfessional(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          )
        }
      />
      <div className="border shadow-sm rounded-lg p-2 mt-6">
        <ProfessionalList 
            onEditProfessional={handleEditProfessional} 
            // onRecordPayment will be added later
        />
      </div>
    </ProtectedRoute>
  );
}
