"use client";

import MetricCard from "@/components/dashboard/MetricCard";
import ProjectCompletionChart from "@/components/dashboard/ProjectCompletionChart";
import PageHeader from "@/components/common/PageHeader";
import { DollarSign, TrendingDown, Users, Landmark, BarChartBig } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useSettings } from "@/contexts/SettingsProvider";
import NotificationList from "@/components/notifications/NotificationList";

// Mock data - replace with actual data fetching
const totalFunds = 1250000;
const totalExpenditures = 45000;
const totalContributions = 75000;
const projectCompletion = 65; // percentage
const overdueMembers = 5;

export default function DashboardPage() {
  const { userProfile } = useAuth();
  const { settings } = useSettings();

  return (
    <>
      <PageHeader
        title={`Welcome, ${userProfile?.name || "User"}!`}
        description="Here's an overview of your group's investments and activities."
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard
          title="Total Funds"
          value={`${settings.currencySymbol} ${totalFunds.toLocaleString()}`}
          icon={Landmark}
          description="Current available balance"
        />
        <MetricCard
          title="Monthly Expenditures"
          value={`${settings.currencySymbol} ${totalExpenditures.toLocaleString()}`}
          icon={TrendingDown}
          description="Expenses this month"
        />
        <MetricCard
          title="Monthly Contributions"
          value={`${settings.currencySymbol} ${totalContributions.toLocaleString()}`}
          icon={DollarSign}
          description="Contributions this month"
        />
         <MetricCard 
          title="Overdue Contributions"
          value={overdueMembers.toString()}
          icon={Users}
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

      {/* Placeholder for more dashboard elements */}
      {/* 
        - Personal Summary Cards (Total Contributions, Penalties, Shares)
        - List of Members with Overdue Contributions (detailed)
        - Milestone Target Tracker
      */}
       <div className="mt-6">
        <h3 className="text-xl font-semibold mb-3">Further Insights</h3>
        {/* Placeholder for more detailed cards or tables */}
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard title="Your Total Contributions" value={`${settings.currencySymbol} 55,000`} icon={DollarSign} description="All time"/>
          <MetricCard title="Your Shares" value="55" icon={BarChartBig} description={`1 Share = ${settings.currencySymbol}1,000`} />
        </div>
      </div>
    </>
  );
}
