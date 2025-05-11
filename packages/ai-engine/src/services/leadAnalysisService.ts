import { LeadScoringAgent, LeadDataFromFrontend, ScoringResult } from '../agents/leadScoringAgent';
import { EmailGenerationAgent, EmailGenerationResult } from '../agents/emailGenerationAgent';
import { Logger } from '@agentic-sales-platform/utils'; // Adjusted path
import { Lead, Interaction as DbInteraction, Company as DbCompany } from '@agentic-sales-platform/database'; // Adjusted path
import { Op } from 'sequelize'; // Assuming Sequelize for Op, adjust if using a different ORM

// This interface maps more closely to what LeadScoringAgent expects
interface AnalysisLeadData extends LeadDataFromFrontend {
    // Add any specific fields needed for analysis if different from frontend data
}

interface AnalyzeLeadResult {
    score: number;
    analysis: ScoringResult; // Using ScoringResult for detailed analysis
    nextActions: string[];
    emailTemplate?: EmailGenerationResult | null; // Changed to EmailGenerationResult
}

export class LeadAnalysisService {
  private leadScoringAgent: LeadScoringAgent;
  private emailGenerationAgent: EmailGenerationAgent;
  private logger: Logger;
  
  constructor() {
    this.leadScoringAgent = new LeadScoringAgent();
    this.emailGenerationAgent = new EmailGenerationAgent();
    this.logger = new Logger('LeadAnalysisService');
  }
  
  async analyzeLead(leadId: string): Promise<AnalyzeLeadResult> {
    this.logger.info(`Analyzing lead: ${leadId}`);
    try {
      // Fetch lead data. This assumes Sequelize syntax from the original snippet.
      // Adjust for your actual ORM (e.g., Mongoose: Lead.findById(leadId).populate('interactions').populate('company'))
      const lead = await Lead.findByPk(leadId, {
        include: [
          // Adjust association names based on your Sequelize model definitions
          // { model: DbInteraction, as: 'interactions' }, 
          // { model: DbCompany, as: 'company' }
        ]
      } as any); // Cast as any to bypass potential include type issues for now
      
      if (!lead) {
        this.logger.error(`Lead with ID ${leadId} not found for analysis.`);
        throw new Error(`Lead with ID ${leadId} not found`);
      }
      
      this.logger.verbose(`Lead data fetched for analysis: ${lead.email}`);

      // Map lead data to the format expected by LeadScoringAgent
      // This mapping is crucial and depends on your DB model structure vs. agent input structure.
      const leadDataForScoring: AnalysisLeadData = {
        id: lead.id,
        name: `${lead.firstName} ${lead.lastName}`,
        email: lead.email as string,
        company: lead.companyName as string, // Assuming companyName from User model, or from a related Company model
        position: lead.title, // Assuming title from User model
        // interactions: lead.interactions?.map(i => ({...i.toJSON()})) || [], // Adapt based on actual Interaction model
        // crm_data: lead.crmData, // Assuming crmData field on lead model
      };
      
      const scoringResult = await this.leadScoringAgent.scoreLead(leadDataForScoring);
      
      // Update lead score in database
      // Adjust for your ORM: await Lead.findByIdAndUpdate(leadId, { score: scoringResult.score, lastAnalyzedAt: new Date() });
      await (lead as any).update({ // Cast to any if update is not directly on Lead type
        score: scoringResult.score,
        // lastAnalyzedAt: new Date(), // Ensure your Lead model has this field
      });
      this.logger.info(`Lead ${leadId} score updated to: ${scoringResult.score}`);
      
      const nextActions = this.determineNextActions(scoringResult.score, lead.status as string); // Assuming status on Lead model
      
      let emailTemplate: EmailGenerationResult | null = null;
      if (nextActions.includes('send_email')) {
        // Map lead data for EmailGenerationAgent
        emailTemplate = await this.emailGenerationAgent.generateEmail({
          leadData: leadDataForScoring, // Re-use mapped data
          purpose: 'Automated Follow-up based on Lead Analysis',
          // senderProfile might come from the lead owner or organization settings
        });
        this.logger.info(`Email template generated for lead ${leadId}`);
      }
      
      return {
        score: scoringResult.score,
        analysis: scoringResult, // Return the full scoring result
        nextActions,
        emailTemplate
      };
    } catch (error) {
      this.logger.error(`Lead analysis error for ${leadId}: ${error.message}`, error);
      throw new Error(`Failed to analyze lead: ${error.message}`);
    }
  }
  
  private determineNextActions(score: number, currentStage?: string): string[] {
    const actions: string[] = [];
    this.logger.debug(`Determining next actions for score: ${score}, stage: ${currentStage}`);
    
    if (score >= 80) {
      actions.push('schedule_meeting');
      actions.push('assign_priority_high');
    } else if (score >= 60) {
      actions.push('send_email');
      actions.push('follow_up_call_medium_priority');
    } else if (score >= 40) {
      actions.push('send_nurture_content');
    } else {
      actions.push('add_to_low_priority_watch_list');
    }
    
    if (currentStage) {
        switch (currentStage.toLowerCase()) {
          case 'new':
            actions.push('perform_initial_research');
            break;
          case 'contacted':
            actions.push('schedule_follow_up_reminder');
            break;
          case 'qualified':
            actions.push('prepare_proposal_or_demo');
            break;
          // default: // No specific action for other stages by default
        }
    }
    this.logger.info(`Determined next actions: ${actions.join(', ')}`);
    return actions;
  }
  
  async batchAnalyzeLeads(filter: any = {}): Promise<number> {
    this.logger.info('Starting batch lead analysis', filter);
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const leadsToAnalyze = await Lead.findAll({
        where: {
          ...filter,
          // [Op.or]: [
          //   { lastAnalyzedAt: { [Op.lt]: twentyFourHoursAgo } }, // Ensure lastAnalyzedAt exists on model
          //   { lastAnalyzedAt: null }
          // ]
        },
        limit: 100 // Process in batches
      } as any); // Cast as any to bypass Op.or issues for now
      
      this.logger.info(`Found ${leadsToAnalyze.length} leads for batch analysis.`);
      
      let successfulAnalyses = 0;
      for (const lead of leadsToAnalyze) {
        try {
          await this.analyzeLead(lead.id);
          successfulAnalyses++;
        } catch (leadError) {
          this.logger.error(`Error analyzing lead ${lead.id} in batch: ${leadError.message}`);
          // Optionally, mark this lead as failed to analyze in DB to avoid retrying immediately
        }
      }
      this.logger.info(`Batch analysis completed. ${successfulAnalyses} leads analyzed.`);
      return successfulAnalyses;
    } catch (error) {
      this.logger.error(`Batch lead analysis error: ${error.message}`, error);
      throw new Error(`Failed to batch analyze leads: ${error.message}`);
    }
  }
}

// Export a singleton instance (optional, depends on how you manage services)
// export const leadAnalysisService = new LeadAnalysisService();
