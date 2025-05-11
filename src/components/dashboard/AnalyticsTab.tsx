import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, LineChart, PieChart as RechartsPieChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, Line, Pie, Cell } from "recharts";
import { DollarSign, Users, Activity, Target } from "lucide-react";

const data = [
  { name: 'Jan', leads: 400, converted: 240, qualified: 300 },
  { name: 'Feb', leads: 300, converted: 139, qualified: 250 },
  { name: 'Mar', leads: 200, converted: 380, qualified: 290 },
  { name: 'Apr', leads: 278, converted: 300, qualified: 200 },
  { name: 'May', leads: 189, converted: 480, qualified: 218 },
  { name: 'Jun', leads: 239, converted: 380, qualified: 250 },
];

const pieData = [
  { name: 'Organic Search', value: 400 },
  { name: 'Referral', value: 300 },
  { name: 'Social Media', value: 300 },
  { name: 'Paid Ads', value: 200 },
];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">Sales Analytics</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2350</div>
            <p className="text-xs text-muted-foreground">+180.1% from last month</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.5%</div>
            <p className="text-xs text-muted-foreground">+2% from last month</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Deal Size</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2,350</div>
            <p className="text-xs text-muted-foreground">+5.2% from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Lead Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{left: 20}}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Legend />
                <Bar dataKey="leads" fill="hsl(var(--chart-1))" name="Total Leads" />
                <Bar dataKey="qualified" fill="hsl(var(--chart-2))" name="Qualified" />
                <Bar dataKey="converted" fill="hsl(var(--chart-3))" name="Converted" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie data={pieData} cx="50%" cy="50%" labelLine={false} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
       <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Monthly Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="leads" stroke="hsl(var(--chart-1))" name="Total Leads" />
                <Line type="monotone" dataKey="converted" stroke="hsl(var(--chart-2))" name="Converted Leads" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
    </div>
  );
}
