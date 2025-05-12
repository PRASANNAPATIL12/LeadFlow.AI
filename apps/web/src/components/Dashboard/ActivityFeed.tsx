import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Mail, Phone, Calendar, MessageSquare, Check, X, User, 
  ArrowUp, ArrowDown, Clock, AlignLeft
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';

interface Activity {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'status_change' | 'score_change';
  timestamp: string;
  leadId: string;
  leadName: string;
  content: string;
  metadata?: {
    scoreChange?: number;
    oldStatus?: string;
    newStatus?: string;
    emailOpened?: boolean;
    emailReplied?: boolean;
    callDuration?: number;
    agentGenerated?: boolean;
  };
}

interface ActivityFeedProps {
  activities: Activity[]; // Accept activities as a prop
}

export function ActivityFeed({ activities: initialActivities = [] }: ActivityFeedProps) { // Use prop or default to empty array
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [isLoading, setIsLoading] = useState(false); // Initially not loading if using props/mock

  // Update activities state if the prop changes
  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  // Remove fetchActivities or modify if needed
  // useEffect(() => {
  //   fetchActivities();
  // }, []);

  // const fetchActivities = async () => {
  //   setIsLoading(true);
  //   try {
  //     const response = await api.get('/activities');
  //     setActivities(response.data);
  //   } catch (error) {
  //     console.error('Error fetching activities:', error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // Remove mock activity generation or keep for standalone testing
  // useEffect(() => {
  //   const mockActivities: Activity[] = [
  //     {
  //       id: '1',
  //       type: 'email',
  //       timestamp: new Date().toISOString(),
  //       leadId: '101',
  //       leadName: 'Acme Corp',
  //       content: 'Follow-up email sent regarding the proposal',
  //       metadata: {
  //         agentGenerated: true
  //       }
  //     },
  //     {
  //       id: '2',
  //       type: 'score_change',
  //       timestamp: new Date(new Date().setHours(new Date().getHours() - 2)).toISOString(),
  //       leadId: '102',
  //       leadName: 'Globex Inc',
  //       content: 'Lead score updated',
  //       metadata: {
  //         scoreChange: 15
  //       }
  //     },
  //     {
  //       id: '3',
  //       type: 'call',
  //       timestamp: new Date(new Date().setHours(new Date().getHours() - 5)).toISOString(),
  //       leadId: '103',
  //       leadName: 'Initech LLC',
  //       content: 'Discovery call completed',
  //       metadata: {
  //         callDuration: 25
  //       }
  //     },
  //     {
  //       id: '4',
  //       type: 'status_change',
  //       timestamp: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
  //       leadId: '104',
  //       leadName: 'Hooli',
  //       content: 'Lead status changed',
  //       metadata: {
  //         oldStatus: 'New',
  //         newStatus: 'Qualified'
  //       }
  //     },
  //     {
  //       id: '5',
  //       type: 'note',
  //       timestamp: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
  //       leadId: '105',
  //       leadName: 'Stark Industries',
  //       content: 'Lead expressed interest in premium features. Follow up next week.'
  //     }
  //   ];
    
  //   setActivities(mockActivities);
  //   setIsLoading(false);
  // }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'call': return <Phone className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'note': return <AlignLeft className="h-4 w-4" />;
      case 'status_change': return <MessageSquare className="h-4 w-4" />;
      case 'score_change': return <ArrowUp className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'call': return 'bg-green-100 text-green-800';
      case 'meeting': return 'bg-purple-100 text-purple-800';
      case 'note': return 'bg-gray-100 text-gray-800';
      case 'status_change': return 'bg-orange-100 text-orange-800';
      case 'score_change': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex justify-center p-4">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">
              No recent activities
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div className={`mt-1 rounded-full p-2 h-8 w-8 flex items-center justify-center ${getActivityColor(activity.type)}`}> {/* Fixed size for icon container */} 
                  {getActivityIcon(activity.type)}
                </div>
                <div className="space-y-1 flex-1"> {/* Added flex-1 */} 
                  <div className="flex items-center gap-2 flex-wrap"> {/* Added flex-wrap */} 
                    <span className="font-medium text-sm">{activity.leadName}</span> {/* Adjusted text size */} 
                    {activity.metadata?.agentGenerated && (
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">AI Generated</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.content}</p> {/* Use muted-foreground for content */} 
                  {activity.metadata?.scoreChange !== undefined && ( // Check for undefined 
                    <div className="flex items-center gap-1 text-sm">
                      <span>Score change:</span>
                      <span className={activity.metadata.scoreChange > 0 ? 'text-green-600' : 'text-red-600'}>
                        {activity.metadata.scoreChange > 0 ? '+' : ''}{activity.metadata.scoreChange}
                      </span>
                    </div>
                  )}
                  {activity.metadata?.oldStatus && activity.metadata?.newStatus && (
                    <div className="text-sm text-muted-foreground">
                      Status: <span className="line-through">{activity.metadata.oldStatus}</span> → {activity.metadata.newStatus}
                    </div>
                  )}
                   {activity.metadata?.callDuration !== undefined && ( // Display call duration 
                    <div className="text-sm text-muted-foreground">
                      Call Duration: {activity.metadata.callDuration} min
                    </div>
                  )} 
                  <div className="text-xs text-muted-foreground pt-1"> {/* Added padding-top */} 
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
