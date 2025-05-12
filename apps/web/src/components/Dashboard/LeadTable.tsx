import React, { useState, useEffect } from 'react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  MoreHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Filter
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { format } from 'date-fns';

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  status: string;
  score: number;
  source: string;
  lastActivity: string;
  assignedTo: string;
}

interface LeadTableProps {
  leads: Lead[]; // Changed to accept leads as a prop
  showFilters?: boolean;
  showPagination?: boolean;
  // limit?: number; // Limit might be handled by pagination logic if API supports it
  isLoading?: boolean; // Added isLoading prop
  onViewLead?: (id: string) => void; // Optional callback
  onEditLead?: (id: string) => void; // Optional callback
  onSendEmailToLead?: (id: string) => void; // Optional callback
  onScheduleMeetingWithLead?: (id: string) => void; // Optional callback
  onUpdateLeadStatus?: (id: string, newStatus: string) => void; // Optional callback
}

export function LeadTable({
  leads: initialLeads = [], // Use prop or default to empty array
  showFilters = false, 
  showPagination = false, 
  isLoading: initialIsLoading = false, // Use prop or default
  onViewLead,
  onEditLead,
  onSendEmailToLead,
  onScheduleMeetingWithLead,
  onUpdateLeadStatus,
}: LeadTableProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [isLoading, setIsLoading] = useState(initialIsLoading);
  const [page, setPage] = useState(1); // Pagination state
  const [totalPages, setTotalPages] = useState(1); // Pagination state, should be set by API response
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortField, setSortField] = useState('lastActivity'); // Default sort field
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Default sort direction

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  useEffect(() => {
    setIsLoading(initialIsLoading);
  }, [initialIsLoading]);

  // Commenting out fetchLeads as data is now passed via props.
  // If you need client-side fetching within this component, you can uncomment and adapt.
  // useEffect(() => {
  //   // fetchLeads(); 
  // }, [page, searchTerm, statusFilter, sourceFilter, sortField, sortDirection]);

  // const fetchLeads = async () => {
  //   setIsLoading(true);
  //   try {
  //     // const response = await api.get('/leads', {
  //     //   params: { /* ... your params ... */ }
  //     // });
  //     // setLeads(response.data.leads);
  //     // setTotalPages(response.data.totalPages);
      
  //     // Using mock data for now if initialLeads is empty
  //     if (initialLeads.length === 0) {
  //       const mockLeads: Lead[] = [
  //         {
  //           id: '1',
  //           name: 'John Smith',
  //           email: 'john@acmecorp.com',
  //           company: 'Acme Corp',
  //           status: 'Qualified',
  //           score: 85,
  //           source: 'Website',
  //           lastActivity: new Date().toISOString(),
  //           assignedTo: 'Alice Johnson'
  //         },
  //         {
  //           id: '2',
  //           name: 'Sarah Miller',
  //           email: 'sarah@globex.com',
  //           company: 'Globex Inc',
  //           status: 'New',
  //           score: 45,
  //           source: 'LinkedIn',
  //           lastActivity: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
  //           assignedTo: 'Bob Smith'
  //         }
  //       ];
  //       setLeads(mockLeads);
  //       setTotalPages(1); 
  //     }
  //     setIsLoading(false);
  //   } catch (error) {
  //     console.error('Error fetching leads:', error);
  //     setIsLoading(false);
  //   }
  // };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'Qualified': return 'bg-green-100 text-green-800';
      case 'Meeting': return 'bg-purple-100 text-purple-800';
      case 'Proposal': return 'bg-yellow-100 text-yellow-800';
      case 'Negotiation': return 'bg-orange-100 text-orange-800';
      case 'Closed Won': return 'bg-emerald-100 text-emerald-800';
      case 'Closed Lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    // Here you would typically call fetchLeads() if doing client-side sorting or refetching from API
    // For prop-driven data, sorting should ideally be handled by the parent or a global state manager
  };

  const getSortIndicator = (field: string) => {
    if (field !== sortField) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };
  
  // Client-side filtering and sorting (if data is passed as prop and not fetched internally)
  const processedLeads = React.useMemo(() => {
    let filtered = [...leads];

    if (searchTerm) {
      filtered = filtered.filter(lead => 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(lead => lead.source === sourceFilter);
    }

    if (sortField) {
      filtered.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        let comparison = 0;
        if (valA > valB) comparison = 1;
        else if (valA < valB) comparison = -1;
        return sortDirection === 'asc' ? comparison : comparison * -1;
      });
    }
    return filtered;
  }, [leads, searchTerm, statusFilter, sourceFilter, sortField, sortDirection]);

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4">
          <div className="relative flex-grow md:flex-grow-0 md:w-auto min-w-[150px]">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-grow md:flex-grow-0 w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Qualified">Qualified</SelectItem>
              <SelectItem value="Meeting">Meeting</SelectItem>
              <SelectItem value="Proposal">Proposal</SelectItem>
              <SelectItem value="Negotiation">Negotiation</SelectItem>
              <SelectItem value="Closed Won">Closed Won</SelectItem>
              <SelectItem value="Closed Lost">Closed Lost</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="flex-grow md:flex-grow-0 w-full sm:w-[180px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="Website">Website</SelectItem>
              <SelectItem value="LinkedIn">LinkedIn</SelectItem>
              <SelectItem value="Referral">Referral</SelectItem>
              <SelectItem value="Event">Event</SelectItem>
              <SelectItem value="Cold Outreach">Cold Outreach</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer whitespace-nowrap"
                onClick={() => handleSort('name')}
              >
                Name {getSortIndicator('name')}
              </TableHead>
              <TableHead className="whitespace-nowrap">Company</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead 
                className="cursor-pointer text-right whitespace-nowrap"
                onClick={() => handleSort('score')}
              >
                Score {getSortIndicator('score')}
              </TableHead>
              <TableHead className="whitespace-nowrap">Source</TableHead>
              <TableHead 
                className="cursor-pointer whitespace-nowrap"
                onClick={() => handleSort('lastActivity')}
              >
                Last Activity {getSortIndicator('lastActivity')}
              </TableHead>
              <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                    <span className="ml-2">Loading leads...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : processedLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No leads found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              processedLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="font-medium text-primary hover:underline cursor-pointer" onClick={() => onViewLead && onViewLead(lead.id)}>{lead.name}</div>
                    <div className="text-sm text-muted-foreground">{lead.email}</div>
                  </TableCell>
                  <TableCell>{lead.company}</TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(lead.status)} hover:opacity-80 transition-opacity`}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${getScoreColor(lead.score)}`}>
                    {lead.score}
                  </TableCell>
                  <TableCell>{lead.source}</TableCell>
                  <TableCell>
                    {format(new Date(lead.lastActivity), 'MMM d, yyyy h:mm a')}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${lead.name}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {onViewLead && <DropdownMenuItem onClick={() => onViewLead(lead.id)}>View Details</DropdownMenuItem>}
                        {onSendEmailToLead && <DropdownMenuItem onClick={() => onSendEmailToLead(lead.id)}>Send Email</DropdownMenuItem>}
                        {onScheduleMeetingWithLead && <DropdownMenuItem onClick={() => onScheduleMeetingWithLead(lead.id)}>Schedule Meeting</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        {onUpdateLeadStatus && <DropdownMenuItem onClick={() => onUpdateLeadStatus(lead.id, 'newStatus') /* Replace 'newStatus' */}>Update Status</DropdownMenuItem>}
                        {onEditLead && <DropdownMenuItem onClick={() => onEditLead(lead.id)}>Edit Lead</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages} (Total {leads.length} leads)
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm" // Standardized size
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm" // Standardized size
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
