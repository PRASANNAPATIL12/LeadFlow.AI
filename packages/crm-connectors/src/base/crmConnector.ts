import { Logger } from '../../ai-engine/src/utils/logger'; // Adjust path as needed

// Generic LeadData interface that can be extended by specific CRM connectors
export interface LeadData {
  id: string;         // CRM's unique ID for the lead
  firstName?: string;
  lastName: string;   // Often a required field
  email?: string;
  phone?: string;
  company: string;    // Often a required field
  position?: string;
  industry?: string;
  leadSource?: string;
  status?: string;     // Lead status in the CRM
  score?: number;      // If the CRM has a native scoring field
  notes?: string;
  crmId?: string;      // Explicitly storing the CRM ID from the source system
  crmSource?: string;  // e.g., 'Salesforce', 'HubSpot'
  rawData?: any;       // To store the original record from CRM for debugging or extended use
  // Add other common fields you expect across CRMs
}

// Generic credentials interface, can be extended
export interface CRMCredentials {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  accessToken?: string;
  instanceUrl?: string; // Common for Salesforce, etc.
  // Add other common credential fields
}

// Base configuration for CRM Connectors (can be empty if all config is in credentials)
export interface CRMConfig { 
    // Potentially API version, default limits, etc.
}

export abstract class CRMConnector<TCreds extends CRMCredentials, TLead extends LeadData = LeadData> {
  protected credentials: TCreds;
  protected config?: CRMConfig; // Optional config separate from credentials
  protected logger: Logger;
  protected baseUrl: string = ''; // Base URL for the CRM API
  
  constructor(credentials: TCreds, config?: CRMConfig) {
    this.credentials = credentials;
    this.config = config;
    // The logger class name should be dynamic based on the derived class name
    // but for a base class, a generic name is fine.
    this.logger = new Logger(this.constructor.name || 'CRMConnectorBase');
  }
  
  // Abstract methods that all CRM connectors must implement
  abstract connect(): Promise<boolean>; // Changed from authenticate for broader meaning
  abstract fetchLeads(params?: Record<string, any>): Promise<TLead[]>;
  abstract fetchLeadById(id: string): Promise<TLead | null>;
  abstract createLead(leadData: Partial<TLead>): Promise<TLead>; // Use Partial for creation
  abstract updateLead(id: string, leadData: Partial<TLead>): Promise<TLead>; // Use Partial for updates
  abstract deleteLead?(id: string): Promise<boolean>; // Optional delete method
  
  // Optional methods for more advanced sync logic
  abstract syncLeads?(options?: { lastSyncTime?: Date, direction?: 'toCRM' | 'fromCRM' | 'bidirectional' }): Promise<{ added: number, updated: number, errors: number }>;
  
  // Utility methods for mapping data - to be implemented by subclasses
  protected abstract mapToInternalLead(crmLeadData: any): TLead;
  protected abstract mapToCrmLead(internalLeadData: Partial<TLead>): any;

  // Optional: A method to get the connector's name/type dynamically
  public getConnectorType(): string {
    return this.constructor.name.replace('Connector', '').toLowerCase();
  }
}
