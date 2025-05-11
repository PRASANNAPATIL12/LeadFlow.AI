// packages/crm-connectors/src/types.ts

// Re-exporting core types from base for easier access
export { LeadData as CRMLeadData, CRMCredentials, CRMConfig } from './base/crmConnector';

export interface SyncResult {
  added: number;
  updated: number;
  deleted?: number; // Optional
  skipped?: number; // Optional
  errors: number;
  errorDetails?: Array<{ id?: string; message: string; data?: any }>;
}

export interface FetchParams {
  limit?: number;
  offset?: number;
  lastModifiedSince?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  customFilters?: Record<string, any>;
}

// Could define specific types for different CRM entities if needed
// export interface CRMContactData extends CRMLeadData { ... }
// export interface CRMCompanyData { ... }
// export interface CRMOpportunityData { ... }
