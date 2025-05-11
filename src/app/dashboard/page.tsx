"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { LeadTable } from "@/components/dashboard/LeadTable";
import { EmailSequencingTab } from "@/components/dashboard/EmailSequencingTab";
import { TaskManagementTab } from "@/components/dashboard/TaskManagementTab";
import { AnalyticsTab } from "@/components/dashboard/AnalyticsTab";
import { mockLeads } from "@/lib/mockData";
import type { Lead } from "@/lib/mockData";
import { Users, CheckCircle, TrendingUp, BarChartHorizontal } from "lucide-react";

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [kpiData, setKpiData] = useState({
    totalLeads: 0,
    qualifiedLeads: 0,
    conversionRate: 0,
    avgLeadScore: 0,
  });

  useEffect(() => {
    // Simulate API call
    setLeads(mockLeads);
    
    const totalLeads = mockLeads.length;
    const qualifiedLeads = mockLeads.filter(lead => lead.status === 'Qualified' || lead.status === 'Proposal' || lead.status === 'Closed Won').length;
    const closedWonLeads = mockLeads.filter(lead => lead.status === 'Closed Won').length;
    const conversionRate = totalLeads > 0 ? parseFloat(((closedWonLeads / totalLeads) * 100).toFixed(1)) : 0;
    const avgLeadScore = totalLeads > 0 ? parseFloat((mockLeads.reduce((sum, lead) => sum + lead.score, 0) / totalLeads).toFixed(1)) : 0;

    setKpiData({ totalLeads, qualifiedLeads, conversionRate, avgLeadScore });
  }, []);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-6">LeadFlow AI Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard title="Total Leads" value={kpiData.totalLeads} icon={Users} description="+20 since last week" trend="up" trendValue="5%" />
        <KpiCard title="Qualified Leads" value={kpiData.qualifiedLeads} icon={CheckCircle} description="+5 since last week" trend="up" trendValue="2%" />
        <KpiCard title="Conversion Rate" value={`${kpiData.conversionRate}%`} icon={TrendingUp} description="Target: 15%" trend="up" trendValue="0.5%" />
        <KpiCard title="Avg. Lead Score" value={kpiData.avgLeadScore} icon={BarChartHorizontal} description="Target: 75" trend="down" trendValue="1.2pts" />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
          <TabsTrigger value="overview">Leads Overview</TabsTrigger>
          <TabsTrigger value="emailSequencing">Email Sequencing</TabsTrigger>
          <TabsTrigger value="taskManagement">Task Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <h2 className="text-2xl font-semibold tracking-tight mb-4">All Leads</h2>
          <LeadTable leads={leads} />
        </TabsContent>
        <TabsContent value="emailSequencing">
          <EmailSequencingTab />
        </TabsContent>
        <TabsContent value="taskManagement">
          <TaskManagementTab />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
