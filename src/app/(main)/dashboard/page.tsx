
"use client";

import MetricCard from "@/components/dashboard/MetricCard";
import ProjectCompletionChart from "@/components/dashboard/ProjectCompletionChart";
import PageHeader from "@/components/common/PageHeader";
import { DollarSign, TrendingDown, Users, Landmark, BarChartBig } from "lucide-react"; // Added BarChartBig
import { useAuth } from "@/contexts/AuthProvider";
import { useSettings } from "@/contexts/SettingsProvider";
import NotificationList from "@/components/notifications/NotificationList";

// Mock data - replace with actual data fetching
const totalFunds = 1250000;
const totalExpenditures = 45000;
const totalContributions = 75000;
const projectCompletion = 65; // percentage
const overdueMembers = 5; // New mock data
const userTotalContributions = 55000; // New mock data for individual user
const userTotalShares = 55; // New mock data for individual user (assuming 1 share = 1000 of currency)

export default function DashboardPage() {
  const { userProfile } = useAuth();
  const { settings } = useSettings();
  const shareValue = 1000; // Assuming 1 share = 1000 of currency, can be made a setting later

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
      
       <div className="mt-6">
        <h3 className="text-xl font-semibold mb-3">Your Personal Summary</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"> {/* Adjusted grid for personal summary */}
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
            icon={Users} // Consider a different icon for penalties, e.g., AlertTriangle
            description="Your outstanding penalties"
          />
        </div>
      </div>

      {/* Placeholder for more dashboard elements */}
      {/* 
        - List of Members with Overdue Contributions (detailed) - (To be implemented later)
        - Milestone Target Tracker - (To be implemented later)
      */}
    </>
  );
}

