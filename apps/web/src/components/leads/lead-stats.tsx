"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, BarChart, PieChart } from "@/components/charts"; // Assuming charts are in @/components/charts

export function LeadStats({ stats }) {
  // Dummy data for charts
  const conversionData = [
    { month: "Jan", qualified: 45, converted: 22 },
    { month: "Feb", qualified: 52, converted: 28 },
    { month: "Mar", qualified: 61, converted: 35 },
    { month: "Apr", qualified: 67, converted: 42 },
    { month: "May", qualified: 75, converted: 48 },
  ];

  const sourceData = [
    { name: "Website", value: 35 },
    { name: "LinkedIn", value: 25 },
    { name: "Referral", value: 20 },
    { name: "Email", value: 15 },
    { name: "Other", value: 5 },
  ];

  const scoreDistributionData = [
    { score: "0-20", count: 8 },
    { score: "21-40", count: 15 },
    { score: "41-60", count: 22 },
    { score: "61-80", count: 28 },
    { score: "81-100", count: 18 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Lead Conversion Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart data={conversionData} xKey="month" yKeys={["qualified", "converted"]} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Lead Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <PieChart data={sourceData} nameKey="name" valueKey="value" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={scoreDistributionData} xKey="score" yKeys={["count"]} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Key Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium">Conversion Rate</div>
              <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            </div>
            <div>
              <div className="text-sm font-medium">Average Response Time</div>
              <div className="text-2xl font-bold">3.4 hours</div>
            </div>
            <div>
              <div className="text-sm font-medium">Average Sales Cycle</div>
              <div className="text-2xl font-bold">18 days</div>
            </div>
            <div>
              <div className="text-sm font-medium">Average Deal Size</div>
              <div className="text-2xl font-bold">$24,500</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
