export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  score: number;
  status: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Closed Won' | 'Closed Lost';
  lastContacted: string;
  source: string;
  dataAiHint?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'To Do' | 'In Progress' | 'Review' | 'Done';
  assignee: {
    name: string;
    avatarUrl?: string;
    dataAiHint?: string;
  };
  leadId?: string;
}

export const mockLeads: Lead[] = [
  { id: '1', name: 'Alice Wonderland', company: 'Mad Hatter Inc.', email: 'alice@madhatter.com', phone: '555-0101', score: 85, status: 'Qualified', lastContacted: '2024-07-15', source: 'Website', dataAiHint: 'woman smiling' },
  { id: '2', name: 'Bob The Builder', company: 'Constructo Corp.', email: 'bob@constructo.com', phone: '555-0102', score: 62, status: 'Contacted', lastContacted: '2024-07-20', source: 'Referral', dataAiHint: 'man construction' },
  { id: '3', name: 'Charlie Chaplin', company: 'Silent Films Ltd.', email: 'charlie@silentfilms.com', phone: '555-0103', score: 92, status: 'Proposal', lastContacted: '2024-07-22', source: 'LinkedIn', dataAiHint: 'man suit' },
  { id: '4', name: 'Diana Prince', company: 'Amazonian Exports', email: 'diana@amazonian.com', phone: '555-0104', score: 78, status: 'Qualified', lastContacted: '2024-07-18', source: 'Cold Email', dataAiHint: 'woman confident' },
  { id: '5', name: 'Edward Scissorhands', company: 'Topiary Creations', email: 'edward@topiary.com', phone: '555-0105', score: 45, status: 'New', lastContacted: '2024-07-25', source: 'Trade Show', dataAiHint: 'man thinking' },
];

export const mockTasks: Task[] = [
  { id: 't1', title: 'Follow up with Alice', description: 'Discuss pricing details.', dueDate: '2024-07-28', priority: 'High', status: 'To Do', assignee: { name: 'John Doe', dataAiHint: 'professional man' }, leadId: '1' },
  { id: 't2', title: 'Initial contact with Bob', dueDate: '2024-07-29', priority: 'Medium', status: 'To Do', assignee: { name: 'Jane Smith', dataAiHint: 'professional woman' }, leadId: '2' },
  { id: 't3', title: 'Prepare proposal for Charlie', description: 'Include premium package options.', dueDate: '2024-07-30', priority: 'High', status: 'In Progress', assignee: { name: 'John Doe', dataAiHint: 'man working' }, leadId: '3' },
  { id: 't4', title: 'Review Diana\'s requirements', dueDate: '2024-07-27', priority: 'Medium', status: 'Review', assignee: { name: 'Jane Smith', dataAiHint: 'woman laptop' }, leadId: '4' },
  { id: 't5', title: 'Schedule demo for Edward', dueDate: '2024-08-01', priority: 'Low', status: 'Done', assignee: { name: 'John Doe', dataAiHint: 'man calendar' }, leadId: '5' },
  { id: 't6', title: 'Draft email sequence for new leads', description: 'Focus on value proposition.', dueDate: '2024-08-05', priority: 'Medium', status: 'In Progress', assignee: { name: 'Jane Smith', dataAiHint: 'woman writing' } },
];

export const taskStatuses: Task['status'][] = ['To Do', 'In Progress', 'Review', 'Done'];
