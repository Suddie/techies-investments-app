
"use client";

import MetricCard from "@/components/dashboard/MetricCard";
import ProjectCompletionChart from "@/components/dashboard/ProjectCompletionChart";
import PageHeader from "@/components/common/PageHeader";
import { DollarSign, TrendingDown, Users, Landmark, BarChartBig, AlertTriangle, UserX, CircleDollarSign, CalendarDays } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useSettings } from "@/contexts/SettingsProvider";
import NotificationList from "@/components/notifications/NotificationList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, limit, Timestamp, getDocs, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { Skeleton } from "@/components/ui/skeleton";
import MilestoneProgressCard from "@/components/dashboard/MilestoneProgressCard";
import type { UserProfile, Milestone } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format, parse, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns';

// Helper function to generate month options
const generateMonthOptions = () => {
  const options = [];
  const currentDate = new Date();
  // Go back 24 months from current month
  for (let i = 24; i >= 0; i--) {
    options.push(subMonths(currentDate, i));
  }
  // Go forward 6 months from current month
  for (let i = 1; i <= 6; i++) {
    options.push(addMonths(currentDate, i));
  }
  return options
    .map(date => ({
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    }))
    .sort((a, b) => b.value.localeCompare(a.value)); // Sort descending for UI (most recent first)
};


export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const { settings } = useSettings();
  const { db } = useFirebase();
  const shareValue = 1;
  const [isMounted, setIsMounted] = useState(false);

  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(format(new Date(), 'yyyy-MM'));
  const monthYearOptions = useMemo(() => generateMonthOptions(), []);

  const [bankBalanceForMonth, setBankBalanceForMonth] = useState<number | null>(null);
  const [totalExpendituresMonth, setTotalExpendituresMonth] = useState<number | null>(null);
  const [totalContributionsMonth, setTotalContributionsMonth] = useState<number | null>(null);
  
  const [userTotalContributions, setUserTotalContributions] = useState<number | null>(null);
  const [userTotalShares, setUserTotalShares] = useState<number | null>(null);
  const [overdueMembers, setOverdueMembers] = useState<UserProfile[]>([]);
  const [projectCompletionPercentage, setProjectCompletionPercentage] = useState(0);

  const [loadingMetrics, setLoadingMetrics] = useState({
    bankBalance: true,
    expenditures: true,
    contributionsMonth: true,
    userSummary: true,
    overdueMembers: true,
    projectCompletion: true,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);


  useEffect(() => {
    if (!isMounted || !db) return;

    let unsubscribes: (() => void)[] = [];

    setLoadingMetrics(prev => ({ 
        ...prev, 
        bankBalance: true,
        expenditures: true,
        contributionsMonth: true,
    }));

    const parsedSelectedDate = parse(selectedMonthYear, 'yyyy-MM', new Date());
    const firstDayOfMonth = startOfMonth(parsedSelectedDate);
    const lastDayOfMonth = endOfMonth(parsedSelectedDate);
    const firstDayTimestamp = Timestamp.fromDate(firstDayOfMonth);
    const lastDayTimestamp = Timestamp.fromDate(lastDayOfMonth);
    
    // Fetch Bank Balance for Selected Month
    const fetchBankBalanceForMonth = async () => {
      try {
        const bankBalancesRef = collection(db, "bankBalances");
        const q = query(bankBalancesRef, where("monthYear", "==", selectedMonthYear), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const balanceDoc = querySnapshot.docs[0];
          setBankBalanceForMonth(balanceDoc.data().closingBalance);
        } else {
          setBankBalanceForMonth(0); // No record for this month, assume 0
        }
      } catch (error) {
        console.error("Error fetching bank balance for month:", error);
        setBankBalanceForMonth(0);
      } finally {
        setLoadingMetrics(prev => ({ ...prev, bankBalance: false }));
      }
    };
    fetchBankBalanceForMonth();

    // Fetch Total Contributions (Selected Month) - client-side filtering for voided
    const contribQuery = query(
      collection(db, "contributions"),
      where("datePaid", ">=", firstDayTimestamp),
      where("datePaid", "<=", lastDayTimestamp),
      orderBy("datePaid") // Good practice for range queries
    );
    const unsubscribeContrib = onSnapshot(contribQuery, (snapshot) => {
      let sumVal = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status !== 'voided') { // Client-side filter for voided status
          sumVal += data.amount;
        }
      });
      setTotalContributionsMonth(sumVal);
      setLoadingMetrics(prev => ({ ...prev, contributionsMonth: false }));
    }, (error) => {
        console.error(`Error fetching contributions for ${selectedMonthYear}:`, error);
        setTotalContributionsMonth(0);
        setLoadingMetrics(prev => ({ ...prev, contributionsMonth: false }));
    });
    unsubscribes.push(unsubscribeContrib);

    // Fetch Total Expenditures (Selected Month)
    const expensesQuery = query(
      collection(db, "expenses"),
      where("date", ">=", firstDayTimestamp), // Assuming 'date' field in expenses
      where("date", "<=", lastDayTimestamp)
    );
    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      let sumVal = 0;
      snapshot.forEach(doc => sumVal += doc.data().totalAmount);
      setTotalExpendituresMonth(sumVal);
      setLoadingMetrics(prev => ({ ...prev, expenditures: false }));
    }, (error) => {
        console.error(`Error fetching expenses for ${selectedMonthYear}:`, error);
        setTotalExpendituresMonth(0);
        setLoadingMetrics(prev => ({ ...prev, expenditures: false }));
    });
    unsubscribes.push(unsubscribeExpenses);


    // ----- Metrics not dependent on selectedMonthYear -----
    // Fetch User's Total Contributions for Personal Summary - excluding voided
    if (user && user.uid && loadingMetrics.userSummary) { // Only fetch if not already loaded or user changes
      const userContribQuery = query(
        collection(db, "contributions"),
        where("userId", "==", user.uid),
        where("status", "!=", "voided") // Exclude voided contributions
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
    } else if (!user && !loadingMetrics.userSummary) { // User logged out, reset
        setUserTotalContributions(0);
        setUserTotalShares(0);
    }


    // Fetch Overdue Members (Active users with penaltyBalance > 0) - Real-time
    if (loadingMetrics.overdueMembers) { // Only fetch if not already loaded
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
    }

    // Fetch Milestones for Project Completion Chart - Real-time
    if (loadingMetrics.projectCompletion) { // Only fetch if not already loaded
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
                setProjectCompletionPercentage(0);
            }
            setLoadingMetrics(prev => ({ ...prev, projectCompletion: false }));
        }, (error) => {
            console.error("Error fetching milestones for project completion:", error);
            setProjectCompletionPercentage(0);
            setLoadingMetrics(prev => ({ ...prev, projectCompletion: false }));
        });
        unsubscribes.push(unsubscribeMilestones);
    }
    // ----- End of non-dependent metrics -----


    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [isMounted, db, user, settings.currencySymbol, selectedMonthYear]);


  const selectedMonthLabel = useMemo(() => {
    return format(parse(selectedMonthYear, 'yyyy-MM', new Date()), 'MMMM yyyy');
  }, [selectedMonthYear]);

  return (
    <>
      <PageHeader
        title={`Welcome, ${userProfile?.name || "User"}!`}
        description="Here's an overview of your group's investments and activities."
        actions={
          <div className="flex items-center gap-2">
            <Label htmlFor="month-selector" className="text-sm font-medium whitespace-nowrap">
              <CalendarDays className="inline-block h-4 w-4 mr-1.5 text-muted-foreground" />
              Summary for:
            </Label>
            <Select value={selectedMonthYear} onValueChange={setSelectedMonthYear}>
              <SelectTrigger id="month-selector" className="w-[180px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthYearOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard
          title="Bank Balance"
          value={!isMounted || loadingMetrics.bankBalance ? <Skeleton className="h-7 w-3/4" /> : `${settings.currencySymbol} ${(bankBalanceForMonth ?? 0).toLocaleString()}`}
          icon={Landmark}
          description={`Closing balance for ${selectedMonthLabel}`}
        />
        <MetricCard
          title="Monthly Expenditures"
          value={!isMounted || loadingMetrics.expenditures ? <Skeleton className="h-7 w-3/4" /> : `${settings.currencySymbol} ${(totalExpendituresMonth ?? 0).toLocaleString()}`}
          icon={TrendingDown}
          description={`Expenses for ${selectedMonthLabel}`}
        />
        <MetricCard
          title="Monthly Contributions"
          value={!isMounted || loadingMetrics.contributionsMonth ? <Skeleton className="h-7 w-3/4" /> : `${settings.currencySymbol} ${(totalContributionsMonth ?? 0).toLocaleString()}`}
          icon={CircleDollarSign}
          description={`Active contributions for ${selectedMonthLabel}`}
        />
         <MetricCard
          title="Currently Overdue Members"
          value={!isMounted || loadingMetrics.overdueMembers ? <Skeleton className="h-7 w-1/4" /> : overdueMembers.length.toString()}
          icon={UserX}
          description="Members with current pending payments"
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
            description="All time active contributions"
          />
          <MetricCard
            title="Your Shares"
            value={!isMounted || loadingMetrics.userSummary ? <Skeleton className="h-7 w-1/2" /> : (userTotalShares ?? 0).toLocaleString()}
            icon={BarChartBig}
            description={`1 Share = ${settings.currencySymbol}${shareValue.toLocaleString()}`}
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
              List of active members with a penalty balance greater than zero. (Real-time)
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
    
