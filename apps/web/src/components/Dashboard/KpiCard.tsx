import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CheckCircle, 
  BarChart, 
  AlertCircle 
} from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  change?: number; // Represents percentage change
  trend?: 'up' | 'down' | 'neutral';
  icon?: 'users' | 'check-circle' | 'bar-chart' | 'alert-circle' | 'trending-up' | string; // Added string for flexibility if more icons are used
  description?: string; // Optional description text
}

export function KpiCard({ 
  title, 
  value, 
  suffix = '', 
  change,
  trend = 'neutral',
  icon,
  description
}: KpiCardProps) {
  const renderIcon = () => {
    switch (icon) {
      case 'users': return <Users className="h-5 w-5 text-primary" />;
      case 'check-circle': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'bar-chart': return <BarChart className="h-5 w-5 text-blue-500" />;
      case 'alert-circle': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'trending-up': return <TrendingUp className="h-5 w-5 text-indigo-500" />;
      // Add more cases for other icons if needed
      default: return null;
    }
  };

  const renderTrendIcon = () => {
    if (trend === 'up' && typeof change !== 'undefined') return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    if (trend === 'down' && typeof change !== 'undefined') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return null;
  };

  const getTrendTextColor = () => {
    if (trend === 'up') return 'text-emerald-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-muted-foreground';
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow h-full"> {/* Added h-full for consistent height in a grid */}
      <CardContent className="pt-5 pb-5 flex flex-col justify-between h-full"> {/* Added flex for alignment */}
        <div>
          <div className="flex justify-between items-start mb-1">
            <p className="text-sm font-medium text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              {title}
            </p>
            {icon && (
              <div className="p-2 bg-muted/50 rounded-lg"> {/* Slightly different icon background */}
                {renderIcon()}
              </div>
            )}
          </div>
          <div className="flex items-baseline">
            <h3 className="text-3xl font-bold"> {/* Increased value font size */}
              {value}{suffix}
            </h3>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>
        
        {typeof change !== 'undefined' && (change !== null || trend !== 'neutral') && (
          <div className="flex items-center gap-1 mt-3">
            {renderTrendIcon()}
            <p className={`text-xs font-medium ${getTrendTextColor()}`}>
              {change !== null ? `${change > 0 ? '+' : ''}${change}%` : ''} {change !==null ? 'from last period' : 'No change'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
