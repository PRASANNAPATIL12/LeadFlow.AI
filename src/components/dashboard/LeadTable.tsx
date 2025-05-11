"use client";

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import Image from 'next/image';
import type { Lead } from '@/lib/mockData';

interface LeadTableProps {
  leads: Lead[];
}

export function LeadTable({ leads: initialLeads }: LeadTableProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Lead | null; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  const sortedLeads = [...leads].sort((a, b) => {
    if (sortConfig.key === null) return 0;
    // Ensure a[sortConfig.key] and b[sortConfig.key] are not undefined before comparison
    const valA = a[sortConfig.key!] ?? '';
    const valB = b[sortConfig.key!] ?? '';

    if (valA < valB) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (valA > valB) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });
  
  const requestSort = (key: keyof Lead) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof Lead) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return '';
  };
  
  const getStatusBadgeVariant = (status: Lead['status']) => {
    switch (status) {
      case 'New': return 'outline';
      case 'Contacted': return 'secondary';
      case 'Qualified': return 'default';
      case 'Proposal': return 'default';
      case 'Closed Won': return 'default';
      case 'Closed Lost': return 'destructive';
      default: return 'outline';
    }
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-500'
    return 'text-red-600';
  };

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Avatar</TableHead>
            <TableHead onClick={() => requestSort('name')} className="cursor-pointer hover:bg-muted/50">Name{getSortIndicator('name')}</TableHead>
            <TableHead onClick={() => requestSort('company')} className="cursor-pointer hover:bg-muted/50">Company{getSortIndicator('company')}</TableHead>
            <TableHead onClick={() => requestSort('score')} className="cursor-pointer hover:bg-muted/50 text-right">Score{getSortIndicator('score')}</TableHead>
            <TableHead onClick={() => requestSort('status')} className="cursor-pointer hover:bg-muted/50">Status{getSortIndicator('status')}</TableHead>
            <TableHead onClick={() => requestSort('lastContacted')} className="cursor-pointer hover:bg-muted/50">Last Contacted{getSortIndicator('lastContacted')}</TableHead>
            <TableHead onClick={() => requestSort('source')} className="cursor-pointer hover:bg-muted/50">Source{getSortIndicator('source')}</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedLeads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell>
                <Image 
                  src={`https://picsum.photos/seed/${lead.id}/40/40`} 
                  alt={lead.name}
                  data-ai-hint={lead.dataAiHint || "professional person"}
                  width={40} 
                  height={40} 
                  className="rounded-full"
                />
              </TableCell>
              <TableCell className="font-medium">{lead.name}</TableCell>
              <TableCell>{lead.company}</TableCell>
              <TableCell className={`text-right font-semibold ${getScoreColor(lead.score)}`}>{lead.score}</TableCell>
              <TableCell><Badge variant={getStatusBadgeVariant(lead.status)}>{lead.status}</Badge></TableCell>
              <TableCell>{new Date(lead.lastContacted).toLocaleDateString()}</TableCell>
              <TableCell>{lead.source}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Edit Lead</DropdownMenuItem>
                    <DropdownMenuItem>Send Email</DropdownMenuItem>
                    <DropdownMenuItem>Add Task</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
