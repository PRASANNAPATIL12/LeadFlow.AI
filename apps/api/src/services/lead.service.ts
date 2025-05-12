// apps/api/src/services/lead.service.ts
import { prisma } from '../lib/prisma';
import { aiEngine } from '@agentic-sales/ai-engine';
import { logger } from '@agentic-sales/logger';
import { sendWebhook } from '../utils/webhookSender';

export interface LeadCreateDto {
  firstName: string;
  lastName: string;
  title?: string;
  email?: string;
  phone?: string;
  company: {
    name: string;
    website?: string;
    industry?: string;
    size?: string;
    revenue?: string;
  };
  source?: string;
  tags?: string[];
  status?: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
}

export interface LeadUpdateDto {
  firstName?: string;
  lastName?: string;
  title?: string;
  email?: string;
  phone?: string;