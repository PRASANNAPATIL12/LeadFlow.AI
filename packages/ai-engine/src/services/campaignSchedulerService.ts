// packages/ai-engine/src/services/campaignSchedulerService.ts
import { Campaign, CampaignStep, Lead } from '@agentic-sales-platform/database'; // Using Sequelize models
import { Op } from 'sequelize';
import { Logger } from '@agentic-sales-platform/utils';
import { EmailGenerationAgent, EmailGenerationRequest } from '../agents/emailGenerationAgent';
import { LeadScoringAgent } from '../agents/leadScoringAgent';

interface CampaignLeadContext { // More specific context for generateEmail
    id: string;
    name: string;
    email: string;
    company: string;
    position?: string;
    industry?: string;
    // Add other fields that EmailGenerationAgent might use from the Lead model
}

export class CampaignSchedulerService {
  private emailAgent: EmailGenerationAgent;
  private leadScoringAgent: LeadScoringAgent;
  private logger: Logger;
  
  constructor() {
    this.emailAgent = new EmailGenerationAgent();
    this.leadScoringAgent = new LeadScoringAgent(); // Instantiate if needed for conditions
    this.logger = new Logger('CampaignSchedulerService');
  }
  
  async processPendingCampaignSteps(): Promise<number> {
    this.logger.info('Processing pending campaign steps...');
    try {
      const activeCampaigns = await Campaign.findAll({
        where: {
          status: 'active',
          startDate: { [Op.lte]: new Date() },
          [Op.or]: [
            { endDate: { [Op.gte]: new Date() } },
            { endDate: null }
          ]
        }
      });
      
      this.logger.info(`Found ${activeCampaigns.length} active campaigns.`);
      let processedStepsCount = 0;
      
      for (const campaign of activeCampaigns) {
        this.logger.debug(`Processing campaign: ${campaign.name} (ID: ${campaign.id})`);
        const steps = await CampaignStep.findAll({
          where: {
            campaignId: campaign.id,
            status: 'pending' // Only process pending steps
          },
          order: [['order', 'ASC']]
        });

        if (steps.length === 0) {
            this.logger.debug(`No pending steps for campaign ${campaign.name}.`);
            continue;
        }
        
        for (const step of steps) {
          this.logger.debug(`Checking step: ${step.name} (Order: ${step.order}) for campaign ${campaign.name}`);
          const isReady = await this.isStepReadyToExecute(step);
          
          if (isReady) {
            this.logger.info(`Executing step: ${step.name} for campaign ${campaign.name}`);
            await this.executeStep(step, campaign); // Pass campaign for context
            processedStepsCount++;
          } else {
            this.logger.debug(`Step ${step.name} is not ready yet.`);
          }
        }
      }
      
      this.logger.info(`Processed ${processedStepsCount} campaign steps in this run.`);
      return processedStepsCount;
    } catch (error) {
      this.logger.error(`Error processing campaign steps: ${error.message}`, error);
      // Depending on the error, you might want to throw it or handle it to allow other processes
      throw new Error(`Failed to process campaign steps: ${error.message}`);
    }
  }
  
  private async isStepReadyToExecute(step: CampaignStep): Promise<boolean> {
    if (step.order > 0) { // Assuming order is 0-indexed for the first step, or 1-indexed and first step has no delay check
      const previousStep = await CampaignStep.findOne({
        where: {
          campaignId: step.campaignId,
          order: step.order - 1
        }
      });
      
      if (!previousStep) {
        this.logger.warn(`Previous step (order ${step.order - 1}) not found for step ${step.name} in campaign ${step.campaignId}. Assuming ready.`);
        // This case might indicate a data integrity issue or first step logic
        return true; 
      }

      if (previousStep.status !== 'completed') {
        this.logger.debug(`Previous step ${previousStep.name} is not completed (status: ${previousStep.status}). Step ${step.name} is not ready.`);
        return false;
      }
      
      if (step.delayHours && step.delayHours > 0) {
          const previousCompletedAt = new Date(previousStep.updatedAt); // Assuming updatedAt reflects completion time
          const delayMilliseconds = step.delayHours * 60 * 60 * 1000;
          const readyTime = new Date(previousCompletedAt.getTime() + delayMilliseconds);
          
          if (readyTime > new Date()) {
            this.logger.debug(`Delay for step ${step.name} not yet passed. Ready at ${readyTime}.`);
            return false;
          }
      }
    }
    
    // Check step conditions if any (complex logic, placeholder for now)
    if (step.conditions) {
      this.logger.debug(`Evaluating conditions for step ${step.name}: ${JSON.stringify(step.conditions)}`);
      // const conditionsMet = await this.evaluateStepConditions(step.conditions, leadIdRelatedToThisStepExecution);
      // if (!conditionsMet) return false;
      this.logger.warn('Step condition evaluation is not fully implemented.');
    }
    
    return true;
  }
  
  private async executeStep(step: CampaignStep, campaign: Campaign): Promise<void> {
    this.logger.info(`Executing campaign step: ${step.id} - ${step.name}`);
    try {
      await step.update({ status: 'active' });
      let success = false;

      // Get target leads for this specific step based on campaign criteria and step logic
      // This is a critical part: how do you know which leads this step applies to now?
      // The original getTargetLeads was more generic. We might need to refine this.
      const leadsForStep = await this.getTargetLeadsForStep(campaign, step);
      this.logger.info(`Found ${leadsForStep.length} leads for step ${step.name}.`);

      if (leadsForStep.length === 0) {
        this.logger.info(`No target leads for step ${step.name}, marking as completed.`);
        await step.update({ status: 'completed', updatedAt: new Date() });
        return;
      }

      for (const lead of leadsForStep) {
        let stepSuccessForLead = false;
        try {
            switch (step.type) {
                case 'email':
                  stepSuccessForLead = await this.executeEmailStep(step, lead, campaign);
                  break;
                // ... other cases ...
                default:
                  this.logger.warn(`Unsupported step type: ${step.type} for step ${step.name}`);
                  stepSuccessForLead = false; // Or true if we consider it 'processed' despite no action
                  break;
            }
        } catch (leadStepError) {
            this.logger.error(`Error executing step ${step.name} for lead ${lead.id}: ${leadStepError.message}`, leadStepError);
            // Optionally mark this specific lead_step_execution as failed
        }
        // Aggregate success if needed, or handle per lead.
        // For simplicity, if any lead processing succeeded, we might consider the step type execution as attempted.
        if(stepSuccessForLead) success = true;
      }
      
      await step.update({
        status: success ? 'completed' : 'failed', // This status might need refinement (e.g. partially_completed)
        updatedAt: new Date()
      });
      this.logger.info(`Step ${step.name} execution overall result: ${success ? 'completed' : 'failed'}`);

    } catch (error) {
      this.logger.error(`Error executing step ${step.name} (ID: ${step.id}): ${error.message}`, error);
      await step.update({ status: 'failed', updatedAt: new Date() });
    }
  }

  // This function needs to determine which leads are eligible for THIS specific step execution
  // This might involve checking a CampaignLeadExecution status table.
  private async getTargetLeadsForStep(campaign: Campaign, step: CampaignStep): Promise<Lead[]> {
    this.logger.warn('getTargetLeadsForStep needs a proper implementation based on CampaignLeadExecution status.');
    // Placeholder: get all leads matching campaign targetAudience for now
    const targetAudienceCriteria = campaign.targetAudience ? JSON.parse(campaign.targetAudience) : {};
    const whereClause: any = {};
    if (targetAudienceCriteria.minScore) {
        // whereClause.score = { [Op.gte]: targetAudienceCriteria.minScore }; // Assuming Lead model has score
    }
    // Add more filters based on campaign.targetAudience
    return Lead.findAll({ where: whereClause, limit: 100 } as any);
  }
  
  private async executeEmailStep(step: CampaignStep, lead: Lead, campaign: Campaign): Promise<boolean> {
    this.logger.info(`Executing EMAIL step ${step.name} for lead ${lead.firstName} ${lead.lastName}`);
    try {
      const emailContentFromStep = step.content?.emailBody; // Assuming content has emailBody
      const emailSubjectFromStep = step.content?.subject;
      const senderProfile = step.content?.senderProfile || { name: campaign.name, title: 'Team', companyName: 'Your Platform' }; // Example default

      // Map lead data to the format expected by EmailGenerationAgent
      const leadDataForEmail: LeadData = {
          id: lead.id,
          name: `${lead.firstName} ${lead.lastName}`,
          company: lead.companyName as string,
          email: lead.email as string,
          position: lead.title, // Assuming lead model has title
          // industry, companySize, etc., if available on Lead model
      };
      
      let finalEmailBody = emailContentFromStep;
      let finalEmailSubject = emailSubjectFromStep;

      if (!finalEmailBody || step.content?.useDynamicContent) {
        const generatedEmail = await this.emailAgent.generateEmail({
          leadData: leadDataForEmail,
          purpose: step.description || 'Campaign Email',
          templateId: step.content?.emailTemplateId, // Assuming templateId in content
          senderProfile: senderProfile
        });
        finalEmailBody = generatedEmail.body;
        finalEmailSubject = generatedEmail.subject;
      }
      
      this.logger.info(`Email for ${lead.email} | Subject: ${finalEmailSubject}`);
      this.logger.verbose(`Email Body: ${finalEmailBody}`);
      // TODO: Integrate with actual Email Sending Service
      // emailService.send({ to: lead.email, subject: finalEmailSubject, htmlBody: finalEmailBody });
      
      // Record interaction (placeholder)
      // await this.recordLeadInteraction(lead, step, 'email', { subject: finalEmailSubject, sentAt: new Date() });
      this.logger.info('Simulated email sending.');
      return true;
    } catch (error) {
      this.logger.error(`Email step ${step.name} execution failed for lead ${lead.id}: ${error.message}`, error);
      return false;
    }
  }
  
  // Placeholder for other step execution methods like executeCallStep, executeContentStep
  // Placeholder for recordLeadInteraction
}

// Export singleton instance (optional)
// export const campaignScheduler = new CampaignSchedulerService();
