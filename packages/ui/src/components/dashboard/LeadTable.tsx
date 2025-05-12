import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { ChevronRightIcon, PhoneIcon, MailIcon } from 'lucide-react';
import { Badge } from '../ui/badge';

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  score: number;
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
  lastActivity?: Date;
}

interface LeadTableProps {
  leads: Lead[];
  onViewLead: (id: string) => void;
  onContactLead: (id: string, method: 'email' | 'phone') => void;
  className?: string;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  onViewLead,
  onContactLead,
  className,
}) => {
  // Get status badge color
  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'unqualified': return 'bg-red-100 text-red-800';
      case 'converted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`rounded-md border ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lead</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="font-medium">{lead.name}</TableCell>
              <TableCell>{lead.company}</TableCell>
              <TableCell>
                <span className={`font-semibold ${getScoreColor(lead.score)}`}>
                  {lead.score}
                </span>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(lead.status)}>
                  {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                {lead.lastActivity ? 
                  new Date(lead.lastActivity).toLocaleDateString() : 
                  'No activity'
                }
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  {lead.email && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onContactLead(lead.id, 'email')}
                    >
                      <MailIcon className="h-4 w-4" />
                    </Button>
                  )}
                  {lead.phone && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onContactLead(lead.id, 'phone')}
                    >
                      <PhoneIcon className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onViewLead(lead.id)}
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};