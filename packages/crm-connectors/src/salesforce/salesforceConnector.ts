import axios from 'axios';
import { CRMConnector, CRMConfig, LeadData as GenericLeadData, CRMCredentials } from '../base/crmConnector';
// Assuming Logger is in packages/ai-engine/src/utils/logger.ts
// Adjust path if it's different or handled by tsconfig paths
import { Logger } from '../../ai-engine/src/utils/logger'; 

// More specific LeadData for Salesforce context if needed, or use GenericLeadData
interface SalesforceLeadData extends GenericLeadData {
  // Salesforce specific fields can be added here if necessary for mapping
  Rating?: string;
  Status?: string; 
}

// Credentials specific to Salesforce password grant (Username-Password Flow)
// For production, OAuth 2.0 web server flow or JWT bearer flow is recommended.
export interface SalesforcePasswordGrantCredentials extends CRMCredentials {
  instanceUrl: string; // e.g., https://yourdomain.my.salesforce.com
  clientId: string;
  clientSecret: string;
  username: string; 
  passwordWithToken: string; // Password appended with Security Token
}

interface SalesforceAuthResponse {
  access_token: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
}

export class SalesforceConnector extends CRMConnector<SalesforcePasswordGrantCredentials> {
  private authData: { accessToken: string; instanceUrl: string } | null = null;
  private tokenExpiryTime: number = 0; // Store token expiry time (ms since epoch)

  constructor(credentials: SalesforcePasswordGrantCredentials) {
    super(credentials);
    this.logger = new Logger('SalesforceConnector');
    this.baseUrl = `${this.credentials.instanceUrl}/services/data/v58.0`; // Example API version
  }

  async authenticate(): Promise<boolean> {
    if (this.authData && Date.now() < this.tokenExpiryTime) {
      this.logger.info('Using existing valid Salesforce token.');
      return true;
    }
    this.logger.info('Authenticating with Salesforce using Username-Password flow...');
    
    const tokenUrl = `${this.credentials.instanceUrl}/services/oauth2/token`;
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', this.credentials.clientId);
    params.append('client_secret', this.credentials.clientSecret);
    params.append('username', this.credentials.username);
    params.append('password', this.credentials.passwordWithToken);

    try {
      const response = await axios.post<SalesforceAuthResponse>(tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      
      this.authData = {
        accessToken: response.data.access_token,
        instanceUrl: response.data.instance_url,
      };
      // Salesforce tokens typically last 2 hours. Setting a buffer of 5 minutes.
      this.tokenExpiryTime = Date.now() + (2 * 60 * 60 * 1000) - (5 * 60 * 1000);
      this.baseUrl = `${this.authData.instanceUrl}/services/data/v58.0`; // Update baseUrl with actual instance_url

      this.logger.info('Salesforce authentication successful.');
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.error_description || error.message;
      this.logger.error(`Salesforce authentication error: ${errorMessage}`);
      this.authData = null;
      this.tokenExpiryTime = 0;
      return false;
    }
  }

  // This method was in your provided code but not in the abstract class. 
  // If it's meant to be part of the abstract class, add it there.
  // For now, it's specific to this implementation if needed, or can be removed if authenticate handles it.
  protected async refreshAccessToken(): Promise<string> {
    this.logger.info('Attempting to refresh Salesforce token (re-authenticating with password grant).');
    const success = await this.authenticate(); // Password grant doesn't have a separate refresh token flow
    if (success && this.authData) {
      return this.authData.accessToken;
    }
    throw new Error('Failed to refresh Salesforce access token.');
  }

  private async makeRequest<T>(endpoint: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET', data?: any): Promise<T> {
    if (!this.authData || Date.now() >= this.tokenExpiryTime) {
      const authenticated = await this.authenticate();
      if (!authenticated || !this.authData) {
        throw new Error('Salesforce authentication required or failed.');
      }
    }

    try {
      const response = await axios<T>({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.authData.accessToken}`,
          'Content-Type': 'application/json',
        },
        data: data,
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.[0]?.message || error.response?.data?.error_description || error.message;
      this.logger.error(`Salesforce API request to ${endpoint} failed: ${errorMessage}`, error.response?.data);
      if (error.response?.status === 401) { // Unauthorized, token might have expired
        this.logger.info('Salesforce token might have expired. Attempting re-authentication.');
        this.authData = null; // Force re-auth on next call
      }
      throw new Error(`Salesforce API Error: ${errorMessage}`);
    }
  }

  async fetchLeads(params: { filters?: string; limit?: number } = {}): Promise<SalesforceLeadData[]> {
    this.logger.info('Fetching leads from Salesforce', params);
    let query = "SELECT Id, FirstName, LastName, Email, Company, Title, Industry, Status, Rating, LeadSource FROM Lead";
    if (params.filters) query += ` WHERE ${params.filters}`;
    if (params.limit) query += ` LIMIT ${params.limit}`;
    else query += ` LIMIT 200`; // Default limit

    const response = await this.makeRequest<{ totalSize: number; done: boolean; records: any[] }>(`/query?q=${encodeURIComponent(query)}`);
    return response.records.map(r => this.mapToInternalLead(r));
  }

  async fetchLeadById(id: string): Promise<SalesforceLeadData | null> {
    this.logger.info(`Fetching lead ${id} from Salesforce`);
    try {
        const record = await this.makeRequest<any>(`/sobjects/Lead/${id}`);
        return this.mapToInternalLead(record);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            this.logger.warn(`Lead ${id} not found in Salesforce.`);
            return null;
        }
        throw error; // Re-throw other errors
    }
  }

  async createLead(leadData: Partial<GenericLeadData>): Promise<SalesforceLeadData> {
    this.logger.info('Creating lead in Salesforce', leadData);
    const sfLeadData = this.mapToCrmLead(leadData);
    const response = await this.makeRequest<{ id: string; success: boolean; errors: any[] }>(`/sobjects/Lead`, 'POST', sfLeadData);
    if (!response.success) {
      throw new Error(`Failed to create Salesforce lead: ${JSON.stringify(response.errors)}`);
    }
    return (await this.fetchLeadById(response.id))!;
  }

  async updateLead(id: string, leadData: Partial<GenericLeadData>): Promise<SalesforceLeadData> {
    this.logger.info(`Updating lead ${id} in Salesforce`, leadData);
    const sfLeadData = this.mapToCrmLead(leadData);
    await this.makeRequest<void>(`/sobjects/Lead/${id}`, 'PATCH', sfLeadData); // Salesforce returns 204 No Content
    return (await this.fetchLeadById(id))!;
  }

  // Abstract class syncLeads needs to be implemented if used directly, or this class should be abstract too.
  // For now, providing a basic implementation for demonstration.
  async syncLeads(): Promise<{ added: number; updated: number; errors: number }> {
    this.logger.info('Performing a generic syncLeads for Salesforce. This should be more specific in a real app.');
    // In a real app, this would fetch recent changes from Salesforce and sync them
    // and/or fetch local changes and push them to Salesforce.
    const leads = await this.fetchLeads({ limit: 10 }); // Fetch a few leads for demo
    // Here you would compare with your local DB and update/create as needed.
    this.logger.info(`Fetched ${leads.length} leads during generic sync.`);
    return { added: leads.length, updated: 0, errors: 0 };
  }

  protected mapToInternalLead(sfLead: any): SalesforceLeadData {
    return {
      id: sfLead.Id,
      firstName: sfLead.FirstName || '',
      lastName: sfLead.LastName || '', 
      email: sfLead.Email || '',
      company: sfLead.Company || '',
      position: sfLead.Title || '',
      industry: sfLead.Industry || '',
      Status: sfLead.Status || '',
      Rating: sfLead.Rating || '',
      leadSource: sfLead.LeadSource || '',
      // crmId should be sfLead.Id
      // crmSource would be 'Salesforce'
      rawData: sfLead, // Good practice to keep the original data
    };
  }

  protected mapToCrmLead(lead: Partial<GenericLeadData>): Record<string, any> {
    const sfData: Record<string, any> = {};
    if (lead.firstName) sfData.FirstName = lead.firstName;
    if (lead.lastName) sfData.LastName = lead.lastName; // Salesforce requires LastName
    else if (!lead.id && lead.company) sfData.LastName = lead.company; // Fallback for new leads if company is name
    else if (!lead.id) sfData.LastName = 'Unknown'; // Default required field

    if (lead.email) sfData.Email = lead.email;
    if (lead.company) sfData.Company = lead.company; // Salesforce requires Company
    else if (!lead.id) sfData.Company = 'Unknown Company'; // Default required field
    
    if (lead.position) sfData.Title = lead.position;
    if (lead.industry) sfData.Industry = lead.industry;
    if (lead.leadSource) sfData.LeadSource = lead.leadSource;
    // if (lead.status) sfData.Status = this.mapOurStatusToSalesforceStatus(lead.status); // Requires status mapping function
    // if (lead.notes) sfData.Description = lead.notes;
    return sfData;
  }

  // Example status mapping (needs to be comprehensive)
  /*
  private mapOurStatusToSalesforceStatus(ourStatus: string): string {
      const mapping = {
          'new': 'Open - Not Contacted',
          'contacted': 'Working - Contacted',
          'qualified': 'Qualified',
          // ... more mappings
      };
      return mapping[ourStatus.toLowerCase()] || 'Open - Not Contacted';
  }
  */
}
