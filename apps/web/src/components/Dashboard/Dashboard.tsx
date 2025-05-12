import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { 
  LineChart, 
  BarChart, 
  PieChart,
  AreaChart,
  ResponsiveContainer,
  Line,
  Bar,
  Pie,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { CalendarIcon, RefreshCw } from 'lucide-react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';

// Assuming these components exist in the same directory or are imported correctly
import { LeadTable } from './LeadTable'; // Adjusted import path if needed
import { LeadStagesFunnel } from './LeadStagesFunnel'; // Adjusted import path if needed
import { ActivityFeed } from './ActivityFeed'; // Adjusted import path if needed
import { TaskList } from './TaskList'; // Adjusted import path if needed
import { KpiCard } from './KpiCard'; // Adjusted import path if needed

import { api } from '@/lib/api';

interface DashboardProps {
  userId: string;
}

export function Dashboard({ userId }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30days');
  const [startDate, setStartDate] = useState<Date>(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>({
    metrics: {
      totalLeads: 0,
      newLeads: 0,
      qualifiedLeads: 0,
      disqualifiedLeads: 0,
      convertedLeads: 0,
      averageScore: 0,
      totalInteractions: 0,
      responseRate: 0,
      avgTimeToRespond: 0,
      avgTimeToQualify: 0
    },
    timeSeriesData: [],
    leadsBySource: [],
    leadsByStatus: [],
    leadsByScore: []
  });
  
  useEffect(() => {
    fetchDashboardData();
  }, [timeRange, startDate, endDate]);
  
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      let period;
      switch (timeRange) {
        case '7days':
          period = {
            startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
            endDate: new Date()
          };
          break;
        case '30days':
          period = {
            startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
            endDate: new Date()
          };
          break;
        case '90days':
          period = {
            startDate: new Date(new Date().setDate(new Date().getDate() - 90)),
            endDate: new Date()
          };
          break;
        case 'custom':
          period = {
            startDate,
            endDate
          };
          break;
        default:
          period = {
            startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
            endDate: new Date()
          };
      }
      
      const response = await api.get('/analytics/leads', {
        params: {
          startDate: period.startDate.toISOString(),
          endDate: period.endDate.toISOString(),
          userId
        }
      });
      
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRefresh = () => {
    fetchDashboardData();
  };
  
  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sales Dashboard</h1>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Button
              variant={timeRange === '7days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('7days')}
            >
              7 Days
            </Button>
            <Button
              variant={timeRange === '30days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('30days')}
            >
              30 Days
            </Button>
            <Button
              variant={timeRange === '90days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('90days')}
            >
              90 Days
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={timeRange === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <CalendarIcon className="h-4 w-4" />
                  {timeRange === 'custom' ? (
                    <span>
                      {format(startDate, 'PP')} - {format(endDate, 'PP')}
                    </span>
                  ) : (
                    <span>Custom Range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{
                    from: startDate,
                    to: endDate,
                  }}
                  onSelect={(range) => {
                    if (range?.from) setStartDate(range.from);
                    if (range?.to) setEndDate(range.to);
                    setTimeRange('custom');
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="analytics">Advanced Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard 
              title="New Leads" 
              value={dashboardData.metrics.newLeads}
              change={12} // Placeholder value
              trend="up" // Placeholder value
              icon="users"
            />
            <KpiCard 
              title="Qualified Leads" 
              value={dashboardData.metrics.qualifiedLeads}
              change={5} // Placeholder value
              trend="up" // Placeholder value
              icon="check-circle"
            />
            <KpiCard 
              title="Avg. Lead Score" 
              value={Math.round(dashboardData.metrics.averageScore)}
              suffix="/100"
              change={2} // Placeholder value
              trend="up" // Placeholder value
              icon="bar-chart"
            />
            <KpiCard 
              title="Conversion Rate" 
              value={dashboardData.metrics.totalLeads > 0 
                ? Math.round((dashboardData.metrics.convertedLeads / dashboardData.metrics.totalLeads) * 100)
                : 0}
              suffix="%"
              change={1.5} // Placeholder value
              trend="up" // Placeholder value
              icon="trending-up"
            />
          </div>
          
          {/* Lead Activity Timeline Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Activity</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dashboardData.timeSeriesData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="newLeads" 
                    name="New Leads" 
                    stackId="1"
                    stroke="#8884d8" 
                    fill="#8884d8" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="qualifiedLeads" 
                    name="Qualified Leads"
                    stackId="2" 
                    stroke="#82ca9d" 
                    fill="#82ca9d" 
                  />
                  {/* Ensure convertedLeads data exists in timeSeriesData or adjust */}
                   <Area 
                     type="monotone" 
                     dataKey="convertedLeads" 
                     name="Converted Leads" 
                     stackId="3"
                     stroke="#ffc658" 
                     fill="#ffc658" 
                   />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lead Source Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Leads by Source</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData.leadsBySource} // Use actual data
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count" // Ensure dataKey matches your data structure
                      nameKey="source" // Ensure nameKey matches your data structure
                      label={({ source, percent }) => `${source}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {dashboardData.leadsBySource.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* Lead Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Leads by Status</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                 {/* Assuming LeadStagesFunnel expects data in a specific format */}
                 <LeadStagesFunnel data={dashboardData.leadFunnel} />
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lead Table */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Leads</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Pass actual lead data to LeadTable */}
                <LeadTable leads={[]} onViewLead={() => {}} onContactLead={() => {}} /> 
              </CardContent>
            </Card>
            
            {/* Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                 {/* Pass actual activity data to ActivityFeed */}
                <ActivityFeed activities={[]} /> 
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="leads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lead Management</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Pass actual lead data and handlers */}
              <LeadTable leads={[]} onViewLead={() => {}} onContactLead={() => {}} showFilters={true} showPagination={true} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                {/* Replace with actual campaign data */}
                <BarChart
                  data={[
                    { name: 'Q1 Outreach', deliveries: 240, responses: 100, meetings: 50 },
                    { name: 'Product Launch', deliveries: 300, responses: 150, meetings: 80 },
                    { name: 'Industry Event', deliveries: 200, responses: 120, meetings: 60 },
                    { name: 'Nurture Sequence', deliveries: 180, responses: 90, meetings: 30 },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="deliveries" name="Email Deliveries" fill="#8884d8" />
                  <Bar dataKey="responses" name="Responses" fill="#82ca9d" />
                  <Bar dataKey="meetings" name="Meetings Booked" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tasks & Followups</CardTitle>
            </CardHeader>
            <CardContent>
               {/* Pass actual task data */}
              <TaskList tasks={[]} /> 
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Rate Over Time</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {/* Replace with actual response rate data */}
                  <LineChart
                    data={[
                      { date: 'Jan', rate: 20 },
                      { date: 'Feb', rate: 25 },
                      { date: 'Mar', rate: 28 },
                      { date: 'Apr', rate: 32 },
                      { date: 'May', rate: 35 },
                      { date: 'Jun', rate: 38 },
                    ]}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="rate" name="Response Rate %" stroke="#8884d8" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Lead Score Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dashboardData.leadsByScore} // Use actual data
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="scoreRange" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Number of Leads" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Dashboard;
