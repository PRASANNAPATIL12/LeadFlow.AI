"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { LeadTable } from "@/components/leads/lead-table";
import { LeadStats } from "@/components/leads/lead-stats";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getLeads, getLeadStats } from "@/lib/api";

export default function DashboardPage() {
  const [leads, setLeads] = useState([]);
  const [leadStats, setLeadStats] = useState({
    totalLeads: 0,
    qualifiedLeads: 0,
    conversionRate: 0,
    averageScore: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Simulate API calls for now, replace with actual getLeads and getLeadStats
        // const [leadsData, statsData] = await Promise.all([
        //   getLeads(),
        //   getLeadStats()
        // ]);
        // For demonstration purposes, using placeholder data:
        const leadsData = [
          { id: '1', name: 'John Doe', company: 'Acme Corp', email: 'john@acme.com', score: 85, status: 'Qualified', lastContact: new Date().toISOString() },
          { id: '2', name: 'Jane Smith', company: 'Beta LLC', email: 'jane@beta.llc', score: 65, status: 'Contacted', lastContact: new Date().toISOString() },
        ];
        const statsData = {
          totalLeads: 150,
          qualifiedLeads: 45,
          conversionRate: 12,
          averageScore: 72,
        };
        setLeads(leadsData);
        setLeadStats(statsData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      <DashboardHeader />
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadStats.totalLeads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Qualified Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadStats.qualifiedLeads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadStats.conversionRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Lead Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadStats.averageScore}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all-leads" className="w-full">
        <TabsList>
          <TabsTrigger value="all-leads">All Leads</TabsTrigger>
          <TabsTrigger value="qualified-leads">Qualified Leads</TabsTrigger>
          <TabsTrigger value="unqualified-leads">Unqualified Leads</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="all-leads">
          <LeadTable leads={leads} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="qualified-leads">
          <LeadTable 
            leads={leads.filter(lead => lead.score >= 70)} 
            isLoading={isLoading} 
          />
        </TabsContent>
        <TabsContent value="unqualified-leads">
          <LeadTable 
            leads={leads.filter(lead => lead.score < 70)} 
            isLoading={isLoading} 
          />
        </TabsContent>
        <TabsContent value="analytics">
          <LeadStats stats={leadStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
