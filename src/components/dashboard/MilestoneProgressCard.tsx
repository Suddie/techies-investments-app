
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Banknote, AlertCircle } from "lucide-react";
import { useFirebase } from '@/contexts/FirebaseProvider';
import { useSettings } from '@/contexts/SettingsProvider';
import type { Milestone } from '@/lib/types';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { logger } from 'firebase-functions'; // Correct import for logger if used in client (though typically not)

export default function MilestoneProgressCard() {
  const { db } = useFirebase();
  const { settings } = useSettings();
  const [isMounted, setIsMounted] = useState(false);
  const [nextMilestone, setNextMilestone] = useState<Milestone | null>(null);
  const [availableFunds, setAvailableFunds] = useState<number | null>(null);
  const [loadingMilestone, setLoadingMilestone] = useState(true);
  const [loadingFunds, setLoadingFunds] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !db) return;

    setLoadingMilestone(true);
    const milestonesRef = collection(db, "milestones");
    const qMilestones = query(
      milestonesRef,
      where("status", "in", ["Not Started", "In Progress"]),
      orderBy("targetDate", "asc"), // This query requires a composite index: milestones (status ASC, targetDate ASC)
      limit(1)
    );

    const unsubMilestones = onSnapshot(qMilestones, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        
        let validTargetDate: Date | undefined = undefined;
        if (data.targetDate) {
          if (data.targetDate instanceof Timestamp) {
            validTargetDate = data.targetDate.toDate();
          } else {
            // Log if targetDate is not a Timestamp - it should always be.
            console.warn(`Milestone ${doc.id} has targetDate that is not a Firestore Timestamp. Original:`, data.targetDate);
            // Attempt conversion if it's a recognizable date string/number, otherwise leave undefined
            const parsed = new Date(data.targetDate);
            if (!isNaN(parsed.getTime())) {
              validTargetDate = parsed;
            }
          }
        }

        setNextMilestone({
          id: doc.id,
          name: data.name || "Unnamed Milestone",
          description: data.description,
          targetAmount: data.targetAmount || 0,
          status: data.status || "Not Started",
          projectId: data.projectId,
          actualCompletionDate: data.actualCompletionDate instanceof Timestamp ? data.actualCompletionDate.toDate() : (data.actualCompletionDate ? new Date(data.actualCompletionDate) : undefined),
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
          targetDate: validTargetDate,
        } as Milestone);
      } else {
        setNextMilestone(null);
      }
      setLoadingMilestone(false);
    }, (error) => {
      console.error("Error fetching next milestone:", error);
      // It's possible an error here (e.g. missing index) could cause the "ca9" assertion.
      // The Firebase console should show a link to create the index if that's the case for qMilestones.
      setLoadingMilestone(false);
    });

    setLoadingFunds(true);
    const bankBalancesRef = collection(db, "bankBalances");
    const qFunds = query(bankBalancesRef, orderBy("monthYear", "desc"), limit(1));

    const unsubFunds = onSnapshot(qFunds, (snapshot) => {
      if (!snapshot.empty) {
        setAvailableFunds(snapshot.docs[0].data().closingBalance);
      } else {
        setAvailableFunds(0);
      }
      setLoadingFunds(false);
    }, (error) => {
      console.error("Error fetching available funds:", error);
      setLoadingFunds(false);
    });

    return () => {
      unsubMilestones();
      unsubFunds();
    };
  }, [isMounted, db]);

  const isLoading = !isMounted || loadingMilestone || loadingFunds;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-3/4 mb-1" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!nextMilestone) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Target className="mr-2 h-5 w-5 text-muted-foreground" />
            Milestone Progress
          </CardTitle>
          <CardDescription>Tracking towards the next project goal.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
            <p>No active milestones found or all milestones completed.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const targetAmount = nextMilestone.targetAmount || 0;
  const funds = availableFunds || 0;
  const progressPercentage = targetAmount > 0 ? Math.min((funds / targetAmount) * 100, 100) : (funds > 0 ? 100 : 0);
  const fundsNeeded = Math.max(0, targetAmount - funds);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Target className="mr-2 h-5 w-5 text-primary" />
          Milestone: {nextMilestone.name}
        </CardTitle>
        <CardDescription>
          Target: {settings.currencySymbol}{targetAmount.toLocaleString()}
          {nextMilestone.targetDate && ` by ${new Date(nextMilestone.targetDate).toLocaleDateString()}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-muted-foreground">Progress to Target</span>
            <span className="text-sm font-bold text-primary">
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="flex justify-between">
            <span>Available Funds:</span>
            <span className="font-medium text-foreground">{settings.currencySymbol}{funds.toLocaleString()}</span>
          </p>
          {targetAmount > funds ? (
            <p className="flex justify-between text-orange-600 dark:text-orange-400">
              <span>Funds Still Needed:</span>
              <span className="font-medium">{settings.currencySymbol}{fundsNeeded.toLocaleString()}</span>
            </p>
          ) : (
            <p className="flex justify-between text-green-600 dark:text-green-400">
              <span>Target Met!</span>
              {funds > targetAmount && (
                 <span className="font-medium">Surplus: {settings.currencySymbol}{(funds - targetAmount).toLocaleString()}</span>
              )}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
