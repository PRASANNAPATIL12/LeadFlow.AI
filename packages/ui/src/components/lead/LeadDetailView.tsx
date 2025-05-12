import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { LeadScoreCard } from '../dashboard/LeadScoreCard';
import { LeadActivityFeed, Activity } from '../dashboard/LeadActivityFeed';
import { MailIcon, PhoneIcon, CalendarIcon, MessageSquareIcon, UserIcon } from 'lucide-react';

interface Contact {
  email?: string;
  phone?: string;
  linkedin?: string;
  twitter?: string;
}

interface Company {
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  revenue?: string;
}

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
  contact: Contact;
  company: Company;
  score: number;
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
  tags?: string[];
  created: Date | string;
  lastActivity?: Date | string;
  fitScore?: number;
  intentScore?: number;
  budgetScore?: number;
  timelineScore?: number;
  notes?: string;
  activities: Activity[];
}

interface LeadDetailViewProps {
  lead: Lead;
  onSendEmail: () => void;
  onScheduleCall: () => void;
  onAddNote: () => void;
  onUpdateStatus: (status: Lead['status']) => void;
  className?: string;
}

export const LeadDetailView: React.FC<LeadDetailViewProps> = ({
  lead,
  onSendEmail,
  onScheduleCall,
  onAddNote,
  onUpdateStatus,
  className,
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {lead.firstName} {lead.lastName}
          </h1>
          <div className="mt-1 flex items-center space-x-2">
            <span className="text-gray-500">{lead.title || 'No title'}</span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-500">{lead.company.name}</span>
            <Badge
              className={
                lead.status === 'qualified'
                  ? 'bg-green-100 text-green-800'
                  : lead.status === 'contacted'
                  ? 'bg-yellow-100 text-yellow-800'
                  : lead.status === 'unqualified'
                  ? 'bg-red-100 text-red-800'
                  : lead.status === 'converted'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              }
            >
              {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
            </Badge>
          </div>
        </div>
        <div className="flex space-x-2">
          {lead.contact.email && (
            <Button variant="outline" size="sm" onClick={onSendEmail}>
              <MailIcon className="mr-2 h-4 w-4" />
              Email
            </Button>
          )}
          {lead.contact.phone && (
            <Button variant="outline" size="sm" onClick={onScheduleCall}>
              <PhoneIcon className="mr-2 h-4 w-4" />
              Call
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onAddNote}>
            <MessageSquareIcon className="mr-2 h-4 w-4" />
            Note
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Lead score card */}
        <LeadScoreCard
          score={lead.score}
          fitScore={lead.fitScore}
          intentScore={lead.intentScore}
          budgetScore={lead.budgetScore}
          timelineScore={lead.timelineScore}
          className="col-span-1"
        />

        {/* Company information */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Company Information</CardTitle>
            <CardDescription>Details about {lead.company.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Website</p>
                <p className="mt-1">{lead.company.website || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Industry</p>
                <p className="mt-1">{lead.company.industry || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Company Size</p>
                <p className="mt-1">{lead.company.size || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Annual Revenue</p>
                <p className="mt-1">{lead.company.revenue || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activities">
        <TabsList>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="contact">Contact Information</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="activities" className="mt-6">
          <LeadActivityFeed activities={lead.activities} />
        </TabsContent>
        <TabsContent value="contact" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
              <CardDescription>Ways to reach {lead.firstName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="mt-1 flex items-center">
                    <MailIcon className="mr-2 h-4 w-4 text-gray-400" />
                    {lead.contact.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="mt-1 flex items-center">
                    <PhoneIcon className="mr-2 h-4 w-4 text-gray-400" />
                    {lead.contact.phone || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">LinkedIn</p>
                  <p className="mt-1 flex items-center">
                    <UserIcon className="mr-2 h-4 w-4 text-gray-400" />
                    {lead.contact.linkedin || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Twitter</p>
                  <p className="mt-1 flex items-center">
                    <UserIcon className="mr-2 h-4 w-4 text-gray-400" />
                    {lead.contact.twitter || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
              <CardDescription>Additional information about this lead</CardDescription>
            </CardHeader>
            <CardContent>
              {lead.notes ? (
                <p className="text-sm">{lead.notes}</p>
              ) : (
                <p className="text-sm text-gray-500">No notes available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};