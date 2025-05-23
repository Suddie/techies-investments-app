
"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Milestone } from '@/lib/types';
import { useAuth } from '@/contexts/AuthProvider';
import { useSettings } from '@/contexts/SettingsProvider';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
// import { Button } from "@/components/ui/button";
// import { MoreHorizontal, Edit2, Trash2 } from "lucide-react";
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


interface MilestoneListProps {
  // onEditMilestone: (milestone: Milestone) => void;
  // onDeleteMilestone: (milestoneId: string) => void; // If delete is added
}

export default function MilestoneList({ /* onEditMilestone */ }: MilestoneListProps) {
  const { userProfile } = useAuth();
  const { settings } = useSettings();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  // const canManageMilestones = userProfile && userProfile.accessLevel <= 1;

  useEffect(() => {
    setLoading(true);
    const milestonesRef = collection(db, "milestones");
    // Assuming milestones might have a 'name' or 'createdAt' for ordering. Using 'name' for now.
    const q = query(milestonesRef, orderBy("name", "asc")); 

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMilestones: Milestone[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const targetDate = data.targetDate instanceof Timestamp ? data.targetDate.toDate() : null;
        const actualCompletionDate = data.actualCompletionDate instanceof Timestamp ? data.actualCompletionDate.toDate() : null;
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null;
        const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null;
        
        fetchedMilestones.push({ 
            id: doc.id, 
            ...data,
            targetDate,
            actualCompletionDate,
            createdAt,
            updatedAt
         } as Milestone);
      });
      setMilestones(fetchedMilestones);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching milestones:", err);
      toast({
        title: "Error Fetching Milestones",
        description: `Could not load milestones: ${err.message}. Check Firestore permissions for the 'milestones' collection.`,
        variant: "destructive",
        duration: 7000,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, toast]);

  if (loading) {
    return (
        <div className="space-y-3 p-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
        </div>
    );
  }
  
  if (milestones.length === 0) {
     return (
        <p className="text-center text-muted-foreground py-8">
            No milestones found. Admin can add milestones for the project.
        </p>
    );
  }

  const getStatusBadgeVariant = (status: Milestone['status']): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'Completed':
        return 'secondary'; // Using secondary for a 'done' look, often green-ish by themes
      case 'In Progress':
        return 'default'; // Primary color
      case 'Not Started':
        return 'outline';
      case 'On Hold':
        return 'outline'; // Consider a yellow-ish outline
      case 'Cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
  const getStatusBadgeClass = (status: Milestone['status']): string => {
     switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300 border-green-300 dark:border-green-700';
      case 'In Progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-800/50 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'Not Started':
         return 'border-gray-400 text-gray-600 dark:border-gray-600 dark:text-gray-400';
      case 'On Hold':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
      case 'Cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300 border-red-300 dark:border-red-700';
      default:
        return 'border-gray-400 text-gray-600 dark:border-gray-600 dark:text-gray-400';
    }
  }


  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Milestone Name</TableHead>
          <TableHead className="hidden md:table-cell">Description</TableHead>
          <TableHead className="text-right">Target Amount ({settings.currencySymbol})</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden sm:table-cell">Target Date</TableHead>
          <TableHead className="hidden sm:table-cell">Completed Date</TableHead>
          {/* {canManageMilestones && <TableHead>Actions</TableHead>} */}
        </TableRow>
      </TableHeader>
      <TableBody>
        {milestones.map((milestone) => (
          <TableRow key={milestone.id}>
            <TableCell className="font-medium">{milestone.name}</TableCell>
            <TableCell className="hidden md:table-cell max-w-xs truncate" title={milestone.description}>
                {milestone.description || <span className="text-muted-foreground/70">-</span>}
            </TableCell>
            <TableCell className="text-right">
                {milestone.targetAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </TableCell>
            <TableCell>
              <Badge variant={getStatusBadgeVariant(milestone.status)} className={getStatusBadgeClass(milestone.status)}>
                {milestone.status}
              </Badge>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
                {milestone.targetDate ? format(new Date(milestone.targetDate), "PP") : <span className="text-muted-foreground/70">-</span>}
            </TableCell>
            <TableCell className="hidden sm:table-cell">
                {milestone.actualCompletionDate ? format(new Date(milestone.actualCompletionDate), "PP") : <span className="text-muted-foreground/70">-</span>}
            </TableCell>
            {/* {canManageMilestones && (
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEditMilestone(milestone)}>
                      <Edit2 className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        onClick={() => milestone.id && onDeleteMilestone(milestone.id)} 
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        disabled={!milestone.id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            )} */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
