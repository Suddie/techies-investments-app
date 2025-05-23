
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import MilestoneList from "@/components/milestones/MilestoneList";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import MilestoneForm, { type MilestoneFormValues } from "@/components/milestones/MilestoneForm";
import { useState } from "react";
import type { Milestone } from "@/lib/types";
import { useAuth } from "@/contexts/AuthProvider";
import { useFirebase } from "@/contexts/FirebaseProvider";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, serverTimestamp, doc, updateDoc, Timestamp } from "firebase/firestore";

export default function MilestonesPage() {
  const { userProfile } = useAuth();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [isMilestoneFormOpen, setIsMilestoneFormOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const canManageMilestones = userProfile && userProfile.accessLevel <= 1; // Level 1 can CRUD

  const handleAddNewMilestone = () => {
    if (!canManageMilestones) {
        toast({ title: "Access Denied", description: "You do not have permission to add milestones.", variant: "destructive"});
        return;
    }
    setEditingMilestone(null);
    setIsMilestoneFormOpen(true);
  };

  const handleEditMilestone = (milestone: Milestone) => {
    if (!canManageMilestones) {
        toast({ title: "Access Denied", description: "You do not have permission to edit milestones.", variant: "destructive"});
        return;
    }
    setEditingMilestone(milestone);
    setIsMilestoneFormOpen(true);
  };

  const handleSaveMilestone = async (data: MilestoneFormValues, milestoneId?: string) => {
    if (!userProfile || !canManageMilestones) {
      toast({ title: "Error", description: "You do not have permission to save milestones.", variant: "destructive" });
      return;
    }

    const milestoneData: Omit<Milestone, "id" | "createdAt" | "updatedAt" | "targetDate" | "actualCompletionDate"> & {
      createdAt?: any;
      updatedAt?: any;
      targetDate?: any;
      actualCompletionDate?: any;
    } = {
      name: data.name,
      description: data.description || "",
      targetAmount: data.targetAmount,
      status: data.status,
      targetDate: data.targetDate ? Timestamp.fromDate(data.targetDate) : null,
      actualCompletionDate: data.actualCompletionDate ? Timestamp.fromDate(data.actualCompletionDate) : null,
      // projectId can be added later if needed
    };

    try {
      if (milestoneId) {
        // Update existing milestone
        const milestoneDocRef = doc(db, "milestones", milestoneId);
        milestoneData.updatedAt = serverTimestamp();
        await updateDoc(milestoneDocRef, milestoneData);
        toast({ title: "Milestone Updated", description: `"${data.name}" has been successfully updated.` });
      } else {
        // Add new milestone
        milestoneData.createdAt = serverTimestamp();
        milestoneData.updatedAt = serverTimestamp();
        await addDoc(collection(db, "milestones"), milestoneData);
        toast({ title: "Milestone Added", description: `"${data.name}" has been successfully added.` });
      }
      setIsMilestoneFormOpen(false);
      setEditingMilestone(null);
    } catch (error: any) {
      console.error("Error saving milestone:", error);
      toast({
        title: "Save Failed",
        description: `Could not save milestone: ${error.message}`,
        variant: "destructive",
      });
    }
  };


  return (
    <ProtectedRoute requiredAccessLevel={3}> {/* Level 3 can view, CRUD is L1 */}
      <PageHeader
        title="Project Milestones"
        description="Track and manage project milestones. (Shopping Mall Project)"
        actions={
          canManageMilestones && (
            <Dialog open={isMilestoneFormOpen} onOpenChange={(isOpen) => {
                setIsMilestoneFormOpen(isOpen);
                if (!isOpen) setEditingMilestone(null);
            }}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNewMilestone}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Milestone
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <MilestoneForm 
                  milestone={editingMilestone} 
                  onSave={handleSaveMilestone}
                  onCancel={() => {
                    setIsMilestoneFormOpen(false);
                    setEditingMilestone(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          )
        }
      />
      <div className="border shadow-sm rounded-lg p-2">
        <MilestoneList 
          onEditMilestone={handleEditMilestone} 
        />
      </div>
    </ProtectedRoute>
  );
}
