// apps/web/src/components/dashboard/DashboardAnalytics.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'; // Assuming local shadcn ui components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, BarChart, PieChart, Line, Bar, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { apiHelpers as api } from '../../lib/api'; // Adjusted from ../utils/api to ../../lib/api
import { Logger } from '@agentic-sales-platform/utils'; // For logging client-side errors or info

const logger = new Logger('DashboardAnalytics');

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A233A2', '#FF69B4']; // Added more colors

const DashboardAnalytics = () => {
  const [timeframe, setTimeframe] = useState('week');
  const [leadData, setLeadData] = useState([]);
  const [conversionData, setConversionData] = useState([]);
  const [stageData, setStageData] = useState([]);
  const [channelData, setChannelData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Replace with actual API calls using apiHelpers
        // The endpoints /analytics/* are not fully defined in the backend routes yet.
        // These are placeholders and will likely need adjustment once the API is built.
        logger.info(`Fetching analytics data for timeframe: ${timeframe}`);

        // Placeholder data structure, adapt to your actual API response
        const mockLeadData = [
            { date: 'Mon', newLeads: 10, qualifiedLeads: 5 }, { date: 'Tue', newLeads: 12, qualifiedLeads: 6 },
            { date: 'Wed', newLeads: 8, qualifiedLeads: 3 }, { date: 'Thu', newLeads: 15, qualifiedLeads: 8 },
            { date: 'Fri', newLeads: 10, qualifiedLeads: 4 }, { date: 'Sat', newLeads: 5, qualifiedLeads: 2 },
            { date: 'Sun', newLeads: 7, qualifiedLeads: 3 },
        ];
        const mockConversionData = [
            { date: 'Jan', conversionRate: 10 }, { date: 'Feb', conversionRate: 12 }, 
            { date: 'Mar', conversionRate: 15 }, { date: 'Apr', conversionRate: 13 }
        ];
        const mockStageData = [
            { name: 'New', value: 100 }, { name: 'Contacted', value: 70 }, 
            { name: 'Qualified', value: 40 }, { name: 'Proposal', value: 20 }, { name: 'Closed', value: 10 }
        ];
        const mockChannelData = [
            { name: 'Organic', value: 400 }, { name: 'PPC', value: 300 }, 
            { name: 'Referral', value: 200 }, { name: 'Social', value: 100 }
        ];

        // Simulating API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        setLeadData(mockLeadData as any);
        setConversionData(mockConversionData as any);
        setStageData(mockStageData as any);
        setChannelData(mockChannelData as any);

        // Example of how you might fetch data once APIs are ready:
        // const [leadRes, conversionRes, stageRes, channelRes] = await Promise.all([
        //   api.getLeadAnalytics({ timeframe }), // Assuming getLeadAnalytics from apiHelpers
        //   api.getLeadConversionAnalytics({ timeframe }), // Placeholder, needs to be defined in apiHelpers
        //   api.getLeadStageAnalytics(), // Placeholder
        //   api.getLeadChannelAnalytics() // Placeholder
        // ]);
        // setLeadData(leadRes.data.data); 
        // setConversionData(conversionRes.data.data);
        // setStageData(stageRes.data.data);
        // setChannelData(channelRes.data.data);

      } catch (err) {
        logger.error('Failed to fetch analytics data:', err);
        setError('Could not load analytics data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [timeframe]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
        <Card className="border-destructive">
            <CardHeader><CardTitle className="text-destructive">Error</CardTitle></CardHeader>
            <CardContent><p>{error}</p></CardContent>
        </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold md:text-2xl">Analytics Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Tabs defaultValue={timeframe} onValueChange={(value) => setTimeframe(value)}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="quarter">Quarter</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead Acquisition</CardTitle>
                <CardDescription>New leads over selected timeframe</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={leadData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="newLeads" stroke={COLORS[0]} name="New Leads" />
                    <Line type="monotone" dataKey="qualifiedLeads" stroke={COLORS[1]} name="Qualified Leads" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion Rate</CardTitle>
                <CardDescription>Lead to opportunity conversion</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conversionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis unit="%" />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    <Bar dataKey="conversionRate" fill={COLORS[2]} name="Conversion Rate" unit="%" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead Stage Distribution</CardTitle>
                <CardDescription>Current lead pipeline overview</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {stageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lead Sources</CardTitle>
                <CardDescription>Where leads are originating from</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channelData} layout="vertical" barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill={COLORS[3]} name="Lead Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
    </div>
  );
};

export default DashboardAnalytics;
