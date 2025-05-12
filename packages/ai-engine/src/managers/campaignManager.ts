import { prisma } from '@agentic-sales/database';
import { logger } from '@agentic-sales/logger';
import { EmailGenerationAgent } from '../agents/emailGenerationAgent';
import { LeadScoringAgent } from '../agents/leadScoringAgent';
import { DecisionEngine } from '../decision/decisionEngine';
import { AgentMemory } from '../memory/agentMemory';
import { LLMConnector } from '../utils/llmConnector'; // Added missing import

interface CampaignStep {
  id: string;
  campaignId: string;
  stepType: 'email' | 'call' | 'social' | 'task' | 'wait' | 'condition';
  order: number;
  settings: Record<string, any>;
  delayDays: number;
  condition?: string;
}

export class CampaignManager {
  private emailAgent: EmailGenerationAgent;
  private leadScoringAgent: LeadScoringAgent;
  private decisionEngine: DecisionEngine;
  private memory: AgentMemory;
  
  constructor() {
    this.emailAgent = new EmailGenerationAgent();
    this.leadScoringAgent = new LeadScoringAgent();
    this.decisionEngine = new DecisionEngine();
    this.memory = new AgentMemory('campaign-manager');
  }
  
  async processCampaignQueue(): Promise<void> {
    try {
      logger.info('Processing campaign queue');
      
      // Find all pending campaign lead entries due for processing
      const pendingEntries = await prisma.campaignLead.findMany({
        where: {
          status: 'in_progress',
          nextStepDate: {
            lte: new Date()
          }
        },
        include: {
          campaign: {
            include: {
              steps: {
                orderBy: {
                  order: 'asc'
                }
              }
            }
          },
          lead: {
            include: {
              contacts: {
                where: {
                  isPrimary: true
                }
              }
            }
          }
        }
      });
      
      logger.info(`Found ${pendingEntries.length} pending campaign entries`);
      
      for (const entry of pendingEntries) {
        await this.processCampaignEntry(entry);
      }
      
    } catch (error) {
      logger.error('Error processing campaign queue', { error });
    }
  }
  
  private async processCampaignEntry(entry: any): Promise<void> {
    try {
      const { campaign, lead, currentStep } = entry;
      const nextStepIndex = currentStep;
      
      // Get the next step to execute
      const step = campaign.steps.find(s => s.order === nextStepIndex);
      
      if (!step) {
        // No more steps, complete campaign for this lead
        await prisma.campaignLead.update({
          where: { id: entry.id },
          data: {
            status: 'completed',
            completedAt: new Date()
          }
        });
        
        logger.info('Campaign completed for lead', { leadId: lead.id, campaignId: campaign.id });
        return;
      }
      
      // Process the step based on its type
      let processed = false;
      let nextStepDelay = step.delayDays * 24 * 60 * 60 * 1000; // convert days to milliseconds
      
      switch (step.stepType) {
        case 'email':
          processed = await this.processEmailStep(step, lead);
          break;
        case 'call':
          processed = await this.processCallStep(step, lead);
          break;
        case 'task':
          processed = await this.processTaskStep(step, lead);
          break;
        case 'wait':
          processed = true; // Wait steps are automatically processed
          break;
        case 'condition':
          const shouldContinue = await this.evaluateCondition(step, lead);
          processed = true; // Conditions are always processed
          
          // If condition fails, find the next step to jump to
          if (!shouldContinue && step.settings.skipToStep) {
            const skipToStepIndex = parseInt(step.settings.skipToStep);
            
            await prisma.campaignLead.update({
              where: { id: entry.id },
              data: {
                currentStep: skipToStepIndex,
                nextStepDate: new Date(Date.now() + nextStepDelay)
              }
            });
            
            logger.info('Condition skipped to step', { 
              leadId: lead.id, 
              campaignId: campaign.id,
              fromStep: step.order,
              toStep: skipToStepIndex
            });
            
            return;
          }
          break;
      }
      
      if (processed) {
        // Move to the next step
        await prisma.campaignLead.update({
          where: { id: entry.id },
          data: {
            currentStep: nextStepIndex + 1,
            nextStepDate: new Date(Date.now() + nextStepDelay)
          }
        });
        
        // Record step completion
        await prisma.campaignStepHistory.create({
          data: {
            campaignLeadId: entry.id,
            stepId: step.id,
            completedAt: new Date(),
            result: 'success',
            notes: `Step ${step.stepType} completed successfully`
          }
        });
        
        logger.info('Campaign step processed', { 
          leadId: lead.id, 
          campaignId: campaign.id, 
          step: nextStepIndex,
          nextStepDate: new Date(Date.now() + nextStepDelay)
        });
      } else {
        // Failed to process step, retry later
        await prisma.campaignLead.update({
          where: { id: entry.id },
          data: {
            nextStepDate: new Date(Date.now() + 4 * 60 * 60 * 1000) // retry in 4 hours
          }
        });
        
        // Record step failure
        await prisma.campaignStepHistory.create({
          data: {
            campaignLeadId: entry.id,
            stepId: step.id,
            completedAt: new Date(),
            result: 'failure',
            notes: `Failed to process ${step.stepType} step, will retry later`
          }
        });
        
        logger.warn('Failed to process campaign step', { 
          leadId: lead.id, 
          campaignId: campaign.id, 
          step: nextStepIndex 
        });
      }
    } catch (error) {
      logger.error('Error processing campaign entry', { entryId: entry.id, error });
    }
  }
  
  private async processEmailStep(step: CampaignStep, lead: any): Promise<boolean> {
    try {
      const primaryContact = lead.contacts[0];
      
      if (!primaryContact) {
        logger.warn('No primary contact found for lead', { leadId: lead.id });
        return false;
      }
      
      // Generate email using EmailGenerationAgent
      const emailResult = await this.emailAgent.generateEmail({
        leadId: lead.id,
        contactId: primaryContact.id,
        campaignId: step.campaignId,
        purpose: step.settings.purpose || 'follow-up',
        tone: step.settings.tone || 'conversational',
        lengthPreference: step.settings.length || 'medium',
        includeCTA: step.settings.includeCTA || true,
        ctaType: step.settings.ctaType || 'meeting'
      });
      
      // Create an email task for the lead owner to review
      await prisma.task.create({
        data: {
          title: `Review campaign email to ${primaryContact.name}`,
          description: `Subject: ${emailResult.subject}

Preview: ${emailResult.body.substring(0, 100)}...`,
          status: 'pending',
          priority: 2,
          dueDate: emailResult.suggestedSendTime,
          taskType: 'email-review',
          leadId: lead.id,
          assignedToId: lead.ownerId,
          metadata: JSON.stringify({
            email: {
              subject: emailResult.subject,
              greeting: emailResult.greeting,
              body: emailResult.body,
              signature: emailResult.signature
            },
            contactId: primaryContact.id,
            campaignId: step.campaignId,
            stepId: step.id
          })
        }
      });
      
      return true;
    } catch (error) {
      logger.error('Error processing email step', { step, leadId: lead.id, error });
      return false;
    }
  }
  
  private async processCallStep(step: CampaignStep, lead: any): Promise<boolean> {
    try {
      const primaryContact = lead.contacts[0];
      
      if (!primaryContact) {
        logger.warn('No primary contact found for lead', { leadId: lead.id });
        return false;
      }
      
      // Generate call script and talking points
      const prompt = `
      Generate talking points for a sales call with the following information:
      - Company: ${lead.company.name}
      - Contact: ${primaryContact.name}, ${primaryContact.title || 'Unknown title'}
      - Purpose: ${step.settings.purpose || 'Follow-up call'}
      - Previous interactions: ${step.settings.previousInteractions || 'None'}
      
      Provide 3-5 key talking points and 2-3 questions to ask.
      `;
      
      const llm = new LLMConnector();
      const talkingPoints = await llm.generateText(prompt);
      
      // Create a call task for the lead owner
      await prisma.task.create({
        data: {
          title: `Call ${primaryContact.name} at ${lead.company.name}`,
          description: `${step.settings.purpose || 'Follow-up call'}

Talking Points:
${talkingPoints}`,
          status: 'pending',
          priority: step.settings.priority || 2,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
          taskType: 'call',
          leadId: lead.id,
          assignedToId: lead.ownerId,
          metadata: JSON.stringify({
            contactId: primaryContact.id,
            campaignId: step.campaignId,
            stepId: step.id,
            phone: primaryContact.phone || 'No phone available'
          })
        }
      });
      
      return true;
    } catch (error) {
      logger.error('Error processing call step', { step, leadId: lead.id, error });
      return false;
    }
  }
  
  private async processTaskStep(step: CampaignStep, lead: any): Promise<boolean> {
    try {
      // Create a custom task based on the step settings
      await prisma.task.create({
        data: {
          title: step.settings.title || `Campaign task for ${lead.company.name}`,
          description: step.settings.description || `Complete the required action for campaign step ${step.order}`,
          status: 'pending',
          priority: step.settings.priority || 2,
          dueDate: new Date(Date.now() + (step.settings.dueDays || 1) * 24 * 60 * 60 * 1000),
          taskType: step.settings.taskType || 'custom',
          leadId: lead.id,
          assignedToId: lead.ownerId,
          metadata: JSON.stringify({
            campaignId: step.campaignId,
            stepId: step.id,
            customData: step.settings.customData || {}
          })
        }
      });
      
      return true;
    } catch (error) {
      logger.error('Error processing task step', { step, leadId: lead.id, error });
      return false;
    }
  }
  
  private async evaluateCondition(step: CampaignStep, lead: any): Promise<boolean> {
    try {
      const condition = step.condition || '';
      
      if (condition.includes('score')) {
        // Evaluate based on lead score
        const scoreThreshold = parseInt(step.settings.scoreThreshold || '50');
        
        // Get latest lead score
        const latestScore = await prisma.leadScore.findFirst({
          where: { leadId: lead.id },
          orderBy: { timestamp: 'desc' }
        });
        
        if (!latestScore) {
          // No score available, score the lead now
          const scoreResult = await this.leadScoringAgent.scoreLead(lead.id);
          return scoreResult.score >= scoreThreshold;
        }
        
        return latestScore.score >= scoreThreshold;
      } else if (condition.includes('interaction')) {
        // Evaluate based on recent interactions
        const days = parseInt(step.settings.interactionDays || '7');
        const count = parseInt(step.settings.interactionCount || '1');
        
        const recentInteractions = await prisma.interaction.count({
          where: {
            leadId: lead.id,
            timestamp: {
              gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            }
          }
        });
        
        return recentInteractions >= count;
      } else {
        // Use decision engine for complex conditions
        const decisionResult = await this.decisionEngine.makeDecision({
          leadId: lead.id,
          actionType: 'campaign-condition',
          conditionType: step.settings.conditionType || 'general',
          conditionData: step.settings
        });
        
        return decisionResult.decision === 'true' || decisionResult.decision === 'yes';
      }
    } catch (error) {
      logger.error('Error evaluating condition', { step, leadId: lead.id, error });
      return false; // Default to false on error
    }
  }
}