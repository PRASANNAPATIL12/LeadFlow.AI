import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell // Import Cell for individual bar segment coloring if needed
} from 'recharts';

interface LeadStage {
  name: string; // Stage name (e.g., 'New', 'Qualified')
  value: number; // Number of leads in this stage
  color: string; // Color for this stage in the funnel
}

interface LeadStagesFunnelProps {
  data: LeadStage[];
}

export function LeadStagesFunnel({ data }: LeadStagesFunnelProps) {
  // If no data provided or data is empty, use sample data for demonstration
  const funnelData = (data && data.length > 0) ? data : [
    { name: 'New', value: 120, color: '#8884d8' },
    { name: 'Contacted', value: 95, color: '#83a6ed' },
    { name: 'Qualified', value: 70, color: '#8dd1e1' },
    { name: 'Proposal', value: 45, color: '#82ca9d' },
    { name: 'Negotiation', value: 25, color: '#a4de6c' },
    { name: 'Won', value: 15, color: '#d0ed57' }
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical" // Funnel charts are often vertical bar charts
        data={funnelData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        barCategoryGap="20%" // Adds some space between bars if they were multiple categories
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} /> {/* Typically hide horizontal grid for vertical funnel */}
        <XAxis type="number" />
        <YAxis 
          dataKey="name" 
          type="category" 
          width={80} // Adjust width for stage names
          axisLine={false}
          tickLine={false}
        />
        <Tooltip 
          formatter={(value: number, name: string, props) => [`${props.payload.name}: ${value}`, null]} 
        />
        {/* 
          For a true funnel, you typically want one bar per category (stage) 
          and the dataKey refers to the value of that stage.
          The mapping to create multiple <Bar> components here will overlay them if they share the same yAxis category.
          If each item in funnelData is a distinct category on the Y-axis, this is fine.
          A common way for funnels is to have a single <Bar dataKey="value"> and use <Cell> for colors.
          However, given the structure, this approach renders each stage as its own bar, which is a valid funnel representation.
        */}
        <Bar dataKey="value" name="Leads" barSize={30}> {/* barSize can control thickness */}
          {funnelData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
