
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ProfessionalForm, { type ProfessionalFormValues } from "@/components/professionals/ProfessionalForm";
import ProfessionalList from "@/components/professionals/ProfessionalList";
import ProfessionalPaymentForm, { type ProfessionalPaymentFormValues } from "@/components/professionals/ProfessionalPaymentForm"; // New Import
import { useState } from "react";
import type { Professional, ProfessionalPayment } from "@/lib/types";
import { useAuth } from "@/contexts/AuthProvider";
import { useFirebase } from "@/contexts/FirebaseProvider";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, Timestamp } from "firebase/firestore";

export default function ProfessionalsPage() {
  const { userProfile } = useAuth();
  const { db } = useFirebase();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);

  // State for Payment Form
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [professionalForPayment, setProfessionalForPayment] = useState<Professional | null>(null);


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
      paymentHistory: ProfessionalPayment[]; 
      balanceDue: number;  
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
      paymentHistory: [], 
      balanceDue: data.totalAgreedCharge, 
    };

    try {
      if (professionalId) {
        const professionalDocRef = doc(db, "professionals", professionalId);
        
        const existingDocSnap = await getDoc(professionalDocRef);
        if (!existingDocSnap.exists()) {
            toast({ title: "Error", description: "Professional record not found for update.", variant: "destructive" });
            return;
        }
        const existingData = existingDocSnap.data() as Professional;
        
        professionalData.paymentHistory = existingData.paymentHistory || []; // Retain existing payment history
        const totalPaid = professionalData.paymentHistory.reduce((sum, p) => sum + p.amountPaid, 0);
        professionalData.balanceDue = data.totalAgreedCharge - totalPaid; // Recalculate balance due based on new total charge
        
        await updateDoc(professionalDocRef, {
            name: professionalData.name,
            serviceType: professionalData.serviceType,
            contactInfo: professionalData.contactInfo,
            assignedJobDescription: professionalData.assignedJobDescription,
            totalAgreedCharge: professionalData.totalAgreedCharge,
            status: professionalData.status,
            balanceDue: professionalData.balanceDue, 
            paymentHistory: professionalData.paymentHistory, // Persist potentially existing payment history
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

  const handleOpenRecordPaymentDialog = (professional: Professional) => {
    if (!canManageProfessionals) {
      toast({ title: "Access Denied", description: "You do not have permission to record payments.", variant: "destructive" });
      return;
    }
    setProfessionalForPayment(professional);
    setIsPaymentFormOpen(true);
  };

  const handleSavePayment = async (paymentData: ProfessionalPaymentFormValues, professional: Professional) => {
    if (!canManageProfessionals || !professional || !professional.id) {
        toast({ title: "Error", description: "Cannot record payment or missing data.", variant: "destructive"});
        return;
    }

    const professionalDocRef = doc(db, "professionals", professional.id);

    try {
        const docSnap = await getDoc(professionalDocRef);
        if (!docSnap.exists()) {
            toast({ title: "Error", description: "Professional not found.", variant: "destructive" });
            return;
        }

        const currentProfessionalData = docSnap.data() as Professional;
        const newPayment: ProfessionalPayment = {
            date: Timestamp.fromDate(paymentData.date),
            amountPaid: paymentData.amountPaid,
            notes: paymentData.notes || "",
        };

        const updatedPaymentHistory = [...(currentProfessionalData.paymentHistory || []), newPayment];
        const totalPaid = updatedPaymentHistory.reduce((sum, p) => sum + p.amountPaid, 0);
        const newBalanceDue = currentProfessionalData.totalAgreedCharge - totalPaid;

        await updateDoc(professionalDocRef, {
            paymentHistory: updatedPaymentHistory,
            balanceDue: newBalanceDue,
            updatedAt: serverTimestamp(),
        });

        toast({ title: "Payment Recorded", description: `Payment of ${paymentData.amountPaid} for ${professional.name} recorded.` });
        setIsPaymentFormOpen(false);
        setProfessionalForPayment(null);
    } catch (error: any) {
        console.error("Error recording payment:", error);
        toast({ title: "Payment Failed", description: error.message, variant: "destructive" });
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
            onRecordPayment={handleOpenRecordPaymentDialog}
        />
      </div>

      {/* Payment Form Dialog */}
      {professionalForPayment && (
        <Dialog open={isPaymentFormOpen} onOpenChange={(isOpen) => {
          setIsPaymentFormOpen(isOpen);
          if (!isOpen) setProfessionalForPayment(null);
        }}>
          <DialogContent className="sm:max-w-md">
            <ProfessionalPaymentForm
              professional={professionalForPayment}
              onSave={(paymentData) => handleSavePayment(paymentData, professionalForPayment)}
              onCancel={() => {
                setIsPaymentFormOpen(false);
                setProfessionalForPayment(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </ProtectedRoute>
  );
}
