
"use client";

import MetricCard from "@/components/dashboard/MetricCard";
import ProjectCompletionChart from "@/components/dashboard/ProjectCompletionChart";
import PageHeader from "@/components/common/PageHeader";
import { DollarSign, TrendingDown, Users, Landmark, BarChartBig, AlertTriangle, UserX } from "lucide-react"; 
import { useAuth } from "@/contexts/AuthProvider";
import { useSettings } from "@/contexts/SettingsProvider";
import NotificationList from "@/components/notifications/NotificationList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, Timestamp, getDocs, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

// Mock data for overdue members - replace with actual data fetching later
const mockOverdueMembers = [
  { id: '1', name: 'John Banda', overdueMonths: 2, lastContribution: '2024-03-01' },
  { id: '2', name: 'Alice Phiri', overdueMonths: 1, lastContribution: '2024-04-15' },
  { id: '3', name: 'Bob Zimba', overdueMonths: 3, lastContribution: '2024-02-10' },
];


export default function DashboardPage() {
  const { userProfile } = useAuth();
  const { settings } = useSettings();
  const { db } = useFirebase();
  const shareValue = 1000; 

  const [totalFunds, setTotalFunds] = useState<number | null>(null);
  const [totalExpenditures, setTotalExpenditures] = useState<number | null>(null);
  const [totalContributions, setTotalContributions] = useState<number | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState({
    funds: true,
    expenditures: true,
    contributions: true,
  });

  const projectCompletion = 65; // percentage (keep mock for now)
  const overdueMembersCount = mockOverdueMembers.length; // Use mock data for count
  const userTotalContributions = 55000; 
  const userTotalShares = userTotalContributions / shareValue;

  useEffect(() => {
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
          setTotalFunds(0); // Default if no bank balances found
        }
      } catch (error) {
        console.error("Error fetching total funds:", error);
        setTotalFunds(0); // Default on error
      } finally {
        setLoadingMetrics(prev => ({ ...prev, funds: false }));
      }
    };
    fetchTotalFunds();

    // Fetch Total Contributions (Current Month)
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    const firstDayTimestamp = Timestamp.fromDate(firstDayOfMonth);
    const lastDayTimestamp = Timestamp.fromDate(lastDayOfMonth);

    const contribQuery = query(
      collection(db, "contributions"),
      where("datePaid", ">=", firstDayTimestamp),
      where("datePaid", "<=", lastDayTimestamp)
    );
    const unsubscribeContrib = onSnapshot(contribQuery, (snapshot) => {
      let sum = 0;
      snapshot.forEach(doc => sum += doc.data().amount);
      setTotalContributions(sum);
      setLoadingMetrics(prev => ({ ...prev, contributions: false }));
    }, (error) => {
        console.error("Error fetching monthly contributions:", error);
        setTotalContributions(0);
        setLoadingMetrics(prev => ({ ...prev, contributions: false }));
    });
    
    // Fetch Total Expenditures (Current Month)
    const expensesQuery = query(
      collection(db, "expenses"),
      where("date", ">=", firstDayTimestamp), // Assuming 'date' in expenses is Firestore Timestamp
      where("date", "<=", lastDayTimestamp)
    );
    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      let sum = 0;
      snapshot.forEach(doc => sum += doc.data().totalAmount);
      setTotalExpenditures(sum);
      setLoadingMetrics(prev => ({ ...prev, expenditures: false }));
    }, (error) => {
        console.error("Error fetching monthly expenses:", error);
        setTotalExpenditures(0);
        setLoadingMetrics(prev => ({ ...prev, expenditures: false }));
    });

    return () => {
      unsubscribeContrib();
      unsubscribeExpenses();
    };
  }, [db]);


  return (
    <>
      <PageHeader
        title={`Welcome, ${userProfile?.name || "User"}!`}
        description="Here's an overview of your group's investments and activities."
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard
          title="Total Funds"
          value={loadingMetrics.funds ? <Skeleton className="h-7 w-3/4" /> : `${settings.currencySymbol} ${(totalFunds ?? 0).toLocaleString()}`}
          icon={Landmark}
          description="Current available balance"
        />
        <MetricCard
          title="Monthly Expenditures"
          value={loadingMetrics.expenditures ? <Skeleton className="h-7 w-3/4" /> : `${settings.currencySymbol} ${(totalExpenditures ?? 0).toLocaleString()}`}
          icon={TrendingDown}
          description="Expenses this month"
        />
        <MetricCard
          title="Monthly Contributions"
          value={loadingMetrics.contributions ? <Skeleton className="h-7 w-3/4" /> : `${settings.currencySymbol} ${(totalContributions ?? 0).toLocaleString()}`}
          icon={DollarSign}
          description="Contributions this month"
        />
         <MetricCard 
          title="Overdue Contributions"
          value={overdueMembersCount.toString()}
          icon={UserX} // Changed icon
          description="Members with pending payments"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
           <ProjectCompletionChart percentage={projectCompletion} />
        </div>
        <div className="lg:col-span-1">
          <NotificationList />
        </div>
      </div>
      
       <div className="mt-6">
        <h3 className="text-xl font-semibold mb-3">Your Personal Summary</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"> 
          <MetricCard 
            title="Your Total Contributions" 
            value={`${settings.currencySymbol} ${userTotalContributions.toLocaleString()}`} 
            icon={DollarSign} 
            description="All time contributions"
          />
          <MetricCard 
            title="Your Shares" 
            value={userTotalShares.toString()} 
            icon={BarChartBig} 
            description={`1 Share = ${settings.currencySymbol}${shareValue.toLocaleString()}`} 
          />
           <MetricCard 
            title="Pending Penalties" 
            value={`${settings.currencySymbol} ${(userProfile?.penaltyBalance || 0).toLocaleString()}`} 
            icon={AlertTriangle} // Changed icon
            description="Your outstanding penalties"
          />
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
            <CardTitle>Members with Overdue Contributions (Mock Data)</CardTitle>
            <CardDescription>This is a placeholder. Real data requires penalty system implementation.</CardDescription>
        </CardHeader>
        <CardContent>
            {mockOverdueMembers.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Member Name</TableHead>
                            <TableHead className="text-center">Overdue Months</TableHead>
                            <TableHead>Last Contribution Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockOverdueMembers.map(member => (
                            <TableRow key={member.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium">{member.name}</TableCell>
                                <TableCell className="text-center">{member.overdueMonths}</TableCell>
                                <TableCell>{member.lastContribution ? format(new Date(member.lastContribution), "PP") : 'N/A'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <p className="text-muted-foreground text-center py-4">No members currently have overdue contributions.</p>
            )}
        </CardContent>
      </Card>
    </>
  );
}

