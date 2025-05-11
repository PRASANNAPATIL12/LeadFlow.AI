// apps/web/src/components/leads/LeadDetail.tsx
"use client"; // For Next.js App Router

import React, { useState, useEffect } from 'react';
// For Next.js App Router, useParams and useNavigate come from 'next/navigation'
import { useParams, useRouter } from 'next/navigation'; 
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button
} from '@agentic-sales-platform/ui'; // Assuming shared UI package
import { 
  User,
  Building,
  BarChart3, // This icon might not be in lucide-react, consider an alternative or adding it
  MessageSquare,
  Calendar,
  Mail,
  Phone
} from 'lucide-react';
import { apiHelpers as api } from '../../lib/api'; // Adjusted import for api helpers

// Placeholder components - these would need to be implemented
const LeadInteractions = ({ leadId }) => <div>Interactions for {leadId} (Placeholder)</div>;
const LeadAnalytics = ({ lead }) => <div>Analytics for {lead.firstName} (Placeholder)</div>;
const LeadActions = ({ lead, onActionComplete }) => <Button onClick={onActionComplete}>Trigger Action (Placeholder)</Button>;
const LeadNotes = ({ leadId }) => <div>Notes for {leadId} (Placeholder)</div>;
const LeadTimeline = ({ lead }) => <div>Timeline for {lead.firstName} (Placeholder)</div>;

export const LeadDetail = () => {
  const params = useParams(); // For Next.js App Router
  const router = useRouter(); // For Next.js App Router
  const id = params?.id as string; // Extract id from params

  const [lead, setLead] = useState<any>(null); // Define a proper type for lead later
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  useEffect(() => {
    const fetchLead = async () => {
      if (!id) {
        setError('Lead ID is missing.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await api.getLead(id); // Using apiHelpers
        setLead(response.data); // Assuming API response structure is { data: leadDetails }
      } catch (err) {
        setError('Failed to load lead details');
        logger.error('Fetch Lead Error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLead();
  }, [id]);
  
  const handleRefreshAnalysis = async () => {
    if (!id) return;
    try {
      setLoading(true);
      // Assuming an endpoint exists like /api/leads/:id/analyze or similar
      // The original code used api.post(`/leads/${id}/analyze`); which matches lead.routes.ts: router.post('/:id/score',...)
      const response = await api.triggerLeadScoring(id); // Adjusted to use a more specific helper if available, or generic post
      // setLead(response.data.lead); // Assuming API response structure from original code
      // Assuming the triggerLeadScoring might not return the full lead, refetch or update locally
      if(response.data && response.data.lead) {
        setLead(response.data.lead);
      } else {
        // If only score is returned, refetch lead details to show updated score
        const updatedLead = await api.getLead(id);
        setLead(updatedLead.data);
      }
      logger.info('Lead analysis refreshed/triggered.');
    } catch (err) {
      setError('Failed to refresh analysis');
      logger.error('Refresh Analysis Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error || !lead) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <p className="text-red-500 mb-4">{error || 'Lead not found'}</p>
          <Button onClick={() => router.push('/dashboard/leads')}>Back to Leads</Button> {/* Adjusted navigation for Next.js */} 
        </CardContent>
      </Card>
    );
  }
  
  // Helper for date formatting
  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            {lead.firstName} {lead.lastName}
          </h1>
          {/* Add company name or other subtitle if available */}
          <p className="text-muted-foreground">{lead.company?.name || 'Unknown Company'}</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleRefreshAnalysis}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Analysis'}
          </Button>
          <Button onClick={() => logger.info('Contact button clicked', { leadId: lead.id })}> {/* Placeholder action */}
            <Mail className="mr-2 h-4 w-4" />
            Contact
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Lead Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start">
              <User className="w-4 h-4 mr-3 mt-1 text-muted-foreground flex-shrink-0" />
              <span>
                {lead.title || 'N/A'} at {lead.company?.name || 'N/A'}
              </span>
            </div>
            <div className="flex items-start">
              <Mail className="w-4 h-4 mr-3 mt-1 text-muted-foreground flex-shrink-0" />
              <span>{lead.email || 'N/A'}</span>
            </div>
            {lead.phone && (
              <div className="flex items-start">
                <Phone className="w-4 h-4 mr-3 mt-1 text-muted-foreground flex-shrink-0" />
                <span>{lead.phone}</span>
              </div>
            )}
            <div className="flex items-start">
              <Building className="w-4 h-4 mr-3 mt-1 text-muted-foreground flex-shrink-0" />
              <span>{lead.company?.industry || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle  className="text-base font-semibold">Lead Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="relative w-28 h-28 md:w-32 md:h-32">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  className="text-gray-200 dark:text-gray-700"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
                <circle
                  className="text-blue-600"
                  strokeWidth="10"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                  strokeDasharray={`${(lead.score / 100) * 2 * Math.PI * 40}`}
                  strokeDashoffset={`${(1 - (lead.score / 100)) * 2 * Math.PI * 40}`}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-3xl font-bold">{lead.score || 0}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Last updated: {formatDate(lead.lastAnalyzed || lead.updatedAt)} 
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Current Stage & Status</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Stage: {lead.stage || 'N/A'}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${lead.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                Status: {lead.status || 'N/A'}
              </span>
            </div>
            {/* Placeholder for stage progress bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${lead.stage === 'new' ? 25 : lead.stage === 'qualified' ? 50 : lead.stage === 'opportunity' ? 75 : 100}%` }}></div>
            </div>
            <div className="text-xs text-muted-foreground">
              In current stage for: {lead.daysInStage || 0} days
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <LeadTimeline lead={lead} />
        </TabsContent>
        <TabsContent value="interactions">
          <LeadInteractions leadId={lead.id} />
        </TabsContent>
        <TabsContent value="analytics">
          <LeadAnalytics lead={lead} />
        </TabsContent>
        <TabsContent value="actions">
          <LeadActions lead={lead} onActionComplete={handleRefreshAnalysis} />
        </TabsContent>
        <TabsContent value="notes">
          <LeadNotes leadId={lead.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// You might want to define this logger instance if it's not globally available
// For client-side components, console is often used directly or a lightweight logger.
const logger = {
    info: console.log,
    error: console.error,
    warn: console.warn
};

export default LeadDetail; // Default export for Next.js page components or dynamic imports
