
"use client";

import MetricCard from "@/components/dashboard/MetricCard";
import ProjectCompletionChart from "@/components/dashboard/ProjectCompletionChart";
import PageHeader from "@/components/common/PageHeader";
import { DollarSign, TrendingDown, Users, Landmark, BarChartBig, AlertTriangle, UserX, CircleDollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useSettings } from "@/contexts/SettingsProvider";
import NotificationList from "@/components/notifications/NotificationList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, Timestamp, getDocs, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { Skeleton } from "@/components/ui/skeleton";
// import { format } from "date-fns"; // No longer needed here
import MilestoneProgressCard from "@/components/dashboard/MilestoneProgressCard";
import type { UserProfile, Milestone } from "@/lib/types";


export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const { settings } = useSettings();
  const { db } = useFirebase();
  const shareValue = settings.contributionMin || 1000;
  const [isMounted, setIsMounted] = useState(false);

  const [totalFunds, setTotalFunds] = useState<number | null>(null);
  const [totalExpenditures, setTotalExpenditures] = useState<number | null>(null);
  const [totalContributionsMonth, setTotalContributionsMonth] = useState<number | null>(null);
  const [userTotalContributions, setUserTotalContributions] = useState<number | null>(null);
  const [userTotalShares, setUserTotalShares] = useState<number | null>(null);
  const [overdueMembers, setOverdueMembers] = useState<UserProfile[]>([]);
  const [projectCompletionPercentage, setProjectCompletionPercentage] = useState(0); // For dynamic project completion

  const [loadingMetrics, setLoadingMetrics] = useState({
    funds: true,
    expenditures: true,
    contributionsMonth: true,
    userSummary: true,
    overdueMembers: true,
    projectCompletion: true, // Added loading state for project completion
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);


  useEffect(() => {
    if (!isMounted || !db) return;

    let unsubscribes: (() => void)[] = [];

    // Fetch Total Funds (Latest Bank Balance)
    const fetchTotalFunds = async () => {
      setLoadingMetrics(prev => ({ ...prev, funds: true }));
      try {
        const bankBalancesRef = collection(db, "bankBalances");
        const q = query(bankBalancesRef, orderBy("monthYear", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const latestBalanceDoc = querySnapshot.docs[0];
          setTotalFunds(latestBalanceDoc.data().closingBalance);
        } else {
          setTotalFunds(0);
        }
      } catch (error) {
        console.error("Error fetching total funds:", error);
        setTotalFunds(0);
      } finally {
        setLoadingMetrics(prev => ({ ...prev, funds: false }));
      }
    };
    fetchTotalFunds();

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    const firstDayTimestamp = Timestamp.fromDate(firstDayOfMonth);
    const lastDayTimestamp = Timestamp.fromDate(lastDayOfMonth);

    // Fetch Total Contributions (Current Month)
    const contribQuery = query(
      collection(db, "contributions"),
      where("datePaid", ">=", firstDayTimestamp),
      where("datePaid", "<=", lastDayTimestamp)
    );
    const unsubscribeContrib = onSnapshot(contribQuery, (snapshot) => {
      let sumVal = 0;
      snapshot.forEach(doc => sumVal += doc.data().amount);
      setTotalContributionsMonth(sumVal);
      setLoadingMetrics(prev => ({ ...prev, contributionsMonth: false }));
    }, (error) => {
        console.error("Error fetching monthly contributions:", error);
        setTotalContributionsMonth(0);
        setLoadingMetrics(prev => ({ ...prev, contributionsMonth: false }));
    });
    unsubscribes.push(unsubscribeContrib);

    // Fetch Total Expenditures (Current Month)
    const expensesQuery = query(
      collection(db, "expenses"),
      where("date", ">=", firstDayTimestamp),
      where("date", "<=", lastDayTimestamp)
    );
    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      let sumVal = 0;
      snapshot.forEach(doc => sumVal += doc.data().totalAmount);
      setTotalExpenditures(sumVal);
      setLoadingMetrics(prev => ({ ...prev, expenditures: false }));
    }, (error) => {
        console.error("Error fetching monthly expenses:", error);
        setTotalExpenditures(0);
        setLoadingMetrics(prev => ({ ...prev, expenditures: false }));
    });
    unsubscribes.push(unsubscribeExpenses);

    // Fetch User's Total Contributions for Personal Summary
    if (user && user.uid) {
      setLoadingMetrics(prev => ({ ...prev, userSummary: true }));
      const userContribQuery = query(
        collection(db, "contributions"),
        where("userId", "==", user.uid)
      );
      const unsubscribeUserContrib = onSnapshot(userContribQuery, (snapshot) => {
        let totalUserSum = 0;
        snapshot.forEach(doc => {
          totalUserSum += (doc.data().amount || 0);
        });
        setUserTotalContributions(totalUserSum);
        setUserTotalShares(shareValue > 0 ? totalUserSum / shareValue : 0);
        setLoadingMetrics(prev => ({ ...prev, userSummary: false }));
      }, (error) => {
        console.error("Error fetching user's total contributions:", error);
        setUserTotalContributions(0);
        setUserTotalShares(0);
        setLoadingMetrics(prev => ({ ...prev, userSummary: false }));
      });
      unsubscribes.push(unsubscribeUserContrib);
    } else {
        setLoadingMetrics(prev => ({ ...prev, userSummary: false }));
        setUserTotalContributions(0);
        setUserTotalShares(0);
    }

    // Fetch Overdue Members (Active users with penaltyBalance > 0)
    setLoadingMetrics(prev => ({ ...prev, overdueMembers: true }));
    const overdueMembersQuery = query(
        collection(db, "users"),
        where("status", "==", "Active"),
        where("penaltyBalance", ">", 0),
        orderBy("penaltyBalance", "desc")
    );
    const unsubscribeOverdueMembers = onSnapshot(overdueMembersQuery, (snapshot) => {
        const members: UserProfile[] = [];
        snapshot.forEach(doc => {
            members.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        setOverdueMembers(members);
        setLoadingMetrics(prev => ({ ...prev, overdueMembers: false }));
    }, (error) => {
        console.error("Error fetching overdue members:", error);
        setOverdueMembers([]);
        setLoadingMetrics(prev => ({ ...prev, overdueMembers: false }));
    });
    unsubscribes.push(unsubscribeOverdueMembers);

    // Fetch Milestones for Project Completion Chart
    setLoadingMetrics(prev => ({ ...prev, projectCompletion: true }));
    const milestonesQuery = query(collection(db, "milestones"));
    const unsubscribeMilestones = onSnapshot(milestonesQuery, (snapshot) => {
        let completedCount = 0;
        const totalCount = snapshot.size;
        snapshot.forEach(doc => {
            const milestone = doc.data() as Milestone;
            if (milestone.status === 'Completed') {
                completedCount++;
            }
        });
        if (totalCount > 0) {
            setProjectCompletionPercentage(Math.round((completedCount / totalCount) * 100));
        } else {
            setProjectCompletionPercentage(0); // Default to 0 if no milestones
        }
        setLoadingMetrics(prev => ({ ...prev, projectCompletion: false }));
    }, (error) => {
        console.error("Error fetching milestones for project completion:", error);
        setProjectCompletionPercentage(0); // Default to 0 on error
        setLoadingMetrics(prev => ({ ...prev, projectCompletion: false }));
    });
    unsubscribes.push(unsubscribeMilestones);


    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [isMounted, db, user, shareValue]);


  return (
    <>
      <PageHeader
        title={`Welcome, ${userProfile?.name || "User"}!`}
        description="Here's an overview of your group's investments and activities."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard
          title="Total Funds"
          value={!isMounted || loadingMetrics.funds ? <Skeleton className="h-7 w-3/4" /> : `${settings.currencySymbol} ${(totalFunds ?? 0).toLocaleString()}`}
          icon={Landmark}
          description="Current available balance"
        />
        <MetricCard
          title="Monthly Expenditures"
          value={!isMounted || loadingMetrics.expenditures ? <Skeleton className="h-7 w-3/4" /> : `${settings.currencySymbol} ${(totalExpenditures ?? 0).toLocaleString()}`}
          icon={TrendingDown}
          description="Expenses this month"
        />
        <MetricCard
          title="Monthly Contributions"
          value={!isMounted || loadingMetrics.contributionsMonth ? <Skeleton className="h-7 w-3/4" /> : `${settings.currencySymbol} ${(totalContributionsMonth ?? 0).toLocaleString()}`}
          icon={CircleDollarSign}
          description="Contributions this month"
        />
         <MetricCard
          title="Overdue Contributions"
          value={!isMounted || loadingMetrics.overdueMembers ? <Skeleton className="h-7 w-1/4" /> : overdueMembers.length.toString()}
          icon={UserX}
          description="Members with pending payments"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3 mb-6">
        <div className="lg:col-span-1">
           {!isMounted || loadingMetrics.projectCompletion ? (
             <Card>
                <CardHeader><Skeleton className="h-5 w-3/4 mb-1" /><Skeleton className="h-4 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-[150px] w-full" /></CardContent>
                <CardFooter><Skeleton className="h-4 w-full" /></CardFooter>
             </Card>
           ) : (
            <ProjectCompletionChart percentage={projectCompletionPercentage} />
           )}
        </div>
        <div className="lg:col-span-1">
           <MilestoneProgressCard />
        </div>
        <div className="lg:col-span-1">
          <NotificationList />
        </div>
      </div>

       <div className="mt-6">
        <h3 className="text-xl font-semibold mb-3">Your Personal Summary</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Your Total Contributions"
            value={!isMounted || loadingMetrics.userSummary ? <Skeleton className="h-7 w-3/4" /> : `${settings.currencySymbol} ${(userTotalContributions ?? 0).toLocaleString()}`}
            icon={DollarSign}
            description="All time contributions"
          />
          <MetricCard
            title="Your Shares"
            value={!isMounted || loadingMetrics.userSummary ? <Skeleton className="h-7 w-1/2" /> : (userTotalShares ?? 0).toFixed(2)}
            icon={BarChartBig}
            description={shareValue > 0 ? `1 Share = ${settings.currencySymbol}${shareValue.toLocaleString()}` : "Share value not set"}
          />
           <MetricCard
            title="Pending Penalties"
            value={!isMounted || loadingMetrics.userSummary ? <Skeleton className="h-7 w-1/2" /> : `${settings.currencySymbol} ${(userProfile?.penaltyBalance || 0).toLocaleString()}`}
            icon={AlertTriangle}
            description="Your outstanding penalties"
          />
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
            <CardTitle>Members with Outstanding Penalties</CardTitle>
            <CardDescription>
              List of active members with a penalty balance greater than zero.
              This list relies on the 'automatedPenaltyGeneration' Cloud Function for accuracy.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {loadingMetrics.overdueMembers ? (
                 <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                 </div>
            ) : overdueMembers.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Member Name</TableHead>
                            <TableHead className="text-right">Outstanding Penalty ({settings.currencySymbol})</TableHead>
                            <TableHead className="hidden md:table-cell">Email</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {overdueMembers.map(member => (
                            <TableRow key={member.uid} className="hover:bg-muted/50">
                                <TableCell className="font-medium">{member.name}</TableCell>
                                <TableCell className="text-right text-destructive font-semibold">
                                    {(member.penaltyBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{member.email}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <p className="text-muted-foreground text-center py-4">
                    <Users className="mx-auto h-8 w-8 mb-2 text-green-500" />
                    No members currently have outstanding penalties.
                </p>
            )}
        </CardContent>
      </Card>
    </>
  );
}

