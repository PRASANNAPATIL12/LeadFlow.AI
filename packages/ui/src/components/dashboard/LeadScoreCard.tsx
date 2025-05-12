import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';

interface LeadScoreCardProps {
  score: number;
  previousScore?: number;
  fitScore?: number;
  intentScore?: number;
  budgetScore?: number;
  timelineScore?: number;
  className?: string;
}

export const LeadScoreCard: React.FC<LeadScoreCardProps> = ({
  score,
  previousScore,
  fitScore,
  intentScore,
  budgetScore,
  timelineScore,
  className,
}) => {
  // Calculate score color based on value
  const getScoreColor = (value: number) => {
    if (value >= 80) return 'text-green-600';
    if (value >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Calculate score change
  const scoreChange = previousScore
  const changeDirection = scoreChange > 0 ? 'up' : scoreChange < 0 ? 'down' : 'same';
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Lead Score</CardTitle>
        <CardDescription>AI-calculated lead quality score</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}</span>
          {previousScore && (
            <span className={`flex items-center ${changeDirection === 'up' ? 'text-green-500' : changeDirection === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
              {changeDirection === 'up' ? '↑' : changeDirection === 'down' ? '↓' : '→'}
              {Math.abs(scoreChange)}
            </span>
          )}
        </div>
        
        {/* Optional detailed scores */}
        {(fitScore || intentScore || budgetScore || timelineScore) && (
          <div className="mt-4 space-y-3">
            {fitScore !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Fit</span>
                  <span className={getScoreColor(fitScore)}>{fitScore}</span>
                </div>
                <Progress value={fitScore} className="h-2" />
              </div>
            )}
            {intentScore !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Intent</span>
                  <span className={getScoreColor(intentScore)}>{intentScore}</span>
                </div>
                <Progress value={intentScore} className="h-2" />
              </div>
            )}
            {budgetScore !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Budget</span>
                  <span className={getScoreColor(budgetScore)}>{budgetScore}</span>
                </div>
                <Progress value={budgetScore} className="h-2" />
              </div>
            )}
            {timelineScore !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Timeline</span>
                  <span className={getScoreColor(timelineScore)}>{timelineScore}</span>
                </div>
                <Progress value={timelineScore} className="h-2" />
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-gray-500">
        Last updated: {new Date().toLocaleDateString()}
      </CardFooter>
    </Card>
  );
};