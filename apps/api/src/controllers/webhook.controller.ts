import { Request, Response } from 'express';
import { Logger } from '@agentic-sales-platform/utils'; // Adjusted import
import { Lead, Interaction, Company } from '@agentic-sales-platform/database'; // Adjusted import
import { SalesforceConnector } from '@agentic-sales-platform/crm-connectors'; // Adjusted import
// import { HubSpotConnector } from '@agentic-sales-platform/crm-connectors'; // Assuming HubSpotConnector will be defined
import { LeadAnalysisService } from '@agentic-sales-platform/ai-engine/src/services/leadAnalysisService'; // Adjusted import

const logger = new Logger('WebhookController');
const leadAnalysisService = new LeadAnalysisService();

// Placeholder: Initialize connectors. In a real app, these would be configured and managed, possibly via a service locator or DI.
// Ensure credentials are securely managed (e.g., via environment variables or a secure config service).
let salesforceConnector: SalesforceConnector; // Initialize if needed, or get from a service
// let hubspotConnector: HubSpotConnector;

// Example initialization (this is NOT production-ready credential handling)
if (process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET && process.env.SALESFORCE_USERNAME && process.env.SALESFORCE_PASSWORD_WITH_TOKEN && process.env.SALESFORCE_INSTANCE_URL) {
    salesforceConnector = new SalesforceConnector({
        clientId: process.env.SALESFORCE_CLIENT_ID,
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
        username: process.env.SALESFORCE_USERNAME,
        passwordWithToken: process.env.SALESFORCE_PASSWORD_WITH_TOKEN,
        instanceUrl: process.env.SALESFORCE_INSTANCE_URL
    });
} else {
    logger.warn('Salesforce connector not initialized due to missing environment variables.');
}

// if (process.env.HUBSPOT_API_KEY) {
// hubspotConnector = new HubSpotConnector({ apiKey: process.env.HUBSPOT_API_KEY });
// } else {
// logger.warn('HubSpot connector not initialized due to missing HUBSPOT_API_KEY.');
// }


export class WebhookController {
  static async salesforce(req: Request, res: Response) {
    logger.info('Salesforce webhook received', { body: req.body });
    try {
      const { event, data } = req.body; // Adjust based on actual Salesforce webhook payload structure
      logger.info(`Processing Salesforce event: ${event}`);
      
      // Ensure data is in the expected format
      if (!data || typeof data !== 'object') {
        logger.warn('Salesforce webhook missing data payload or data is not an object.');
        return res.status(400).json({ success: false, message: 'Invalid payload data.'});
      }

      switch (event) {
        case 'lead_created': // Example event name, adjust to actual Salesforce event
        case 'lead.created': 
          await WebhookController.handleNewLead(data, 'salesforce');
          break;
        case 'lead_updated':
        case 'lead.updated':
          await WebhookController.handleUpdatedLead(data, 'salesforce');
          break;
        // case 'contact_created': // From original code, might be same as lead or different
        // case 'contact.created':
        //   await WebhookController.handleNewContact(data, 'salesforce');
        //   break;
        // case 'opportunity_updated':
        // case 'opportunity.updated':
        //   await WebhookController.handleOpportunityUpdate(data, 'salesforce');
        //   break;
        default:
          logger.warn(`Unhandled Salesforce event type: ${event}`);
      }
      
      return res.status(200).json({ success: true, message: 'Webhook processed' });
    } catch (error) {
      logger.error(`Salesforce webhook processing error: ${error.message}`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to process Salesforce webhook' 
      });
    }
  }
  
  static async hubspot(req: Request, res: Response) {
    logger.info('HubSpot webhook received', { body: req.body });
    try {
      // HubSpot webhooks often come in an array of events
      const events = Array.isArray(req.body) ? req.body : [req.body];

      for (const event of events) {
        const { subscriptionType, objectId, propertyName, propertyValue } = event; // Common HubSpot fields
        logger.info(`Processing HubSpot event: ${subscriptionType} for objectId: ${objectId}`);

        // if (!hubspotConnector) {
        //   logger.error('HubSpot connector not available to process webhook.');
        //   // Depending on policy, you might still return 200 to HubSpot to prevent retries
        //   return res.status(503).json({ success: false, message: 'HubSpot connector not configured.' });
        // }

        switch (subscriptionType) {
          case 'contact.creation':
            // const contactData = await hubspotConnector.fetchLeadById(objectId.toString()); // Assuming fetchLeadById can fetch contacts
            // if (contactData) await WebhookController.handleNewLead(contactData, 'hubspot');
            logger.info('Placeholder for HubSpot contact.creation'); 
            break;
          case 'contact.propertyChange':
            // const updatedContactData = await hubspotConnector.fetchLeadById(objectId.toString());
            // if (updatedContactData) await WebhookController.handleUpdatedLead(updatedContactData, 'hubspot');
            logger.info('Placeholder for HubSpot contact.propertyChange');
            break;
          // case 'deal.propertyChange':
          //   // const dealData = await hubspotConnector.fetchDealById(objectId.toString()); // Requires fetchDealById
          //   // if (dealData) await WebhookController.handleOpportunityUpdate(dealData, 'hubspot');
          //   logger.info('Placeholder for HubSpot deal.propertyChange');
          //   break;
          default:
            logger.warn(`Unhandled HubSpot subscriptionType: ${subscriptionType}`);
        }
      }
      
      return res.status(200).json({ success: true, message: 'Webhook processed' });
    } catch (error) {
      logger.error(`HubSpot webhook processing error: ${error.message}`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to process HubSpot webhook' 
      });
    }
  }
  
  // Ensure data parameter is typed based on expected CRM payload structure
  private static async handleNewLead(data: any, source: string) {
    logger.info(`Handling new lead from ${source}`, { email: data.email });
    try {
      // This uses Mongoose syntax now, aligning with database/models/lead.model.ts
      let lead = await Lead.findOne({
        email: data.email, // Assuming email is a reliable unique identifier from webhook
        // externalSource: source, // Add externalSource to your Lead schema if you want to differentiate
      });
      
      if (lead) {
        logger.info(`Lead already exists: ${data.email}. Consider updating if appropriate.`);
        // Optionally, update existing lead if webhook provides more/updated info
        // lead.set(mappedData); await lead.save();
        return;
      }
      
      let companyId: string | undefined = undefined;
      if (data.company || data.Company) { // Accommodate different casing from CRMs
        const companyName = data.company || data.Company;
        const companyData = {
          name: companyName,
          industry: data.industry || data.Industry || 'Unknown',
          // size: data.companySize || data.CompanySize || 'Unknown',
          // website: data.website || data.Website || null
        };
        // Find or create company (Mongoose syntax)
        let companyDoc = await Company.findOne({ name: companyName });
        if (!companyDoc) {
          companyDoc = await Company.create(companyData);
          logger.info(`Created new company: ${companyName}`);
        }
        companyId = companyDoc.id;
      }
      
      const newLeadData = {
        email: data.email || data.Email,
        firstName: data.firstName || data.FirstName || '',
        lastName: data.lastName || data.LastName || (data.Name ? data.Name.split(' ').slice(-1).join(' ') : 'Lead'), // Basic split if only full Name
        phone: data.phone || data.Phone || '',
        title: data.title || data.Title || '',
        externalSource: source,
        externalId: data.id || data.Id || null, // CRM's ID
        status: 'new', // Default status for new leads from webhook
        score: 0, // Initial score
        companyName: data.company || data.Company, // Storing company name directly if not linking to Company model strictly
        organizationId: 'YOUR_DEFAULT_ORGANIZATION_ID', // This needs to be determined, e.g. via API key in webhook if multi-tenant
        // companyId: companyId, // If linking to a separate Company collection
        // lastInteractionAt: new Date() // Ensure your Lead model has this
      };

      lead = await Lead.create(newLeadData as any); // Cast to any for Mongoose flexibility
      logger.info(`New lead created via webhook from ${source}: ${lead.email} (ID: ${lead.id})`);
      
      await Interaction.create({
        leadId: lead.id,
        type: 'WEBHOOK_RECEIVED', // More specific type
        channel: source,
        content: `Lead data received from ${source} webhook. Event: ${source === 'salesforce' ? 'lead.created' : 'contact.creation'}`,
        timestamp: new Date(),
        organizationId: newLeadData.organizationId // Match organizationId
      } as any);
      
      await leadAnalysisService.analyzeLead(lead.id);
      
    } catch (error) {
      logger.error(`Error in handleNewLead from ${source}: ${error.message}`, { data, error });
      // Do not rethrow here to allow other webhooks in a batch to process, but log thoroughly.
    }
  }
  
  private static async handleUpdatedLead(data: any, source: string) {
    logger.info(`Handling updated lead from ${source}`, { email: data.email, id: data.id });
    // Find existing lead by externalId and source
    // Map incoming CRM data to your Lead model fields
    // Update the lead in your database
    // Optionally, trigger re-analysis: await leadAnalysisService.analyzeLead(lead.id);
    // logger.info(`Lead ${lead.id} updated from ${source}.`);
  }
  
  // Removed handleNewContact and handleOpportunityUpdate for brevity, assuming they follow similar patterns
  // or that leads/contacts are handled uniformly by handleNewLead/handleUpdatedLead.
}
