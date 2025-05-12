packages/ui/src/components/leads/LeadAnalyticsChart.tsx
```typescript
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';

interface ChartData {
  name: string;
  leads: number;
  qualified: number;
  converted: number;
}

interface LeadAnalyticsChartProps {
  data: ChartData[];
  className?: string;
}

export const LeadAnalyticsChart: React.FC<LeadAnalyticsChartProps> = ({ data, className }) => {
  const [timeRange, setTimeRange] = React.useState('30d');

  // Filter data based on time range
  const getFilteredData = () => {
    // This would normally filter based on the timeRange
    // For demo purposes, we'll just return all data
    return data;
  };

  const chartData = getFilteredData();

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">Lead Analytics</CardTitle>
          <CardDescription>Lead acquisition and conversion trends</CardDescription>
        </div>
        <Select defaultValue={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="ytd">Year to date</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <LineChart
            width={600}
            height={300}
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="leads" stroke="#8884d8" />
            <Line type="monotone" dataKey="qualified" stroke="#82ca9d" />
            <Line type="monotone" dataKey="converted" stroke="#ff7300" />
          </LineChart>
        </div>
      </CardContent>
    </Card>
  );
};
```