import { Logger } from '../../../packages/ai-engine/src/utils/logger';
import { MessageQueue } from '../../../packages/message-queue/src/index';
import { EmailGenerationAgent } from '../../../packages/ai-engine/src/agents/emailGenerationAgent';
import { PrismaClient } from '../../../packages/database/src/client';
import { EmailService } from '../../../packages/email-service/src/index';
import config from './config';

export class CampaignWorker {
  private logger: Logger;
  private messageQueue: MessageQueue;
  private prisma: PrismaClient;
  private emailAgent: EmailGenerationAgent;
  private emailService: EmailService;
  private running: boolean = false;
  private campaignInterval: NodeJS.Timeout | null = null;

  constructor(messageQueue: MessageQueue) {
    this.logger = new Logger('CampaignWorker');
    this.messageQueue = messageQueue;
    this.prisma = new PrismaClient();
    this.emailAgent = new EmailGenerationAgent({
      modelName: config.ai.emailGenerationModel,
      apiKey: config.ai.apiKey
    });
    this.emailService = new EmailService(config.email);
  }

  async start(): Promise<void> {
    this.logger.info('Starting Campaign Worker');
    this.running = true;
    
    // Subscribe to campaign execution events
    await this.messageQueue.subscribe('campaign.execute', this.handleCampaignExecution.bind(this));
    await this.messageQueue.subscribe('campaign.step.execute', this.handleCampaignStepExecution.bind(this));
    
    // Start periodic campaign processing
    this.campaignInterval = setInterval(this.processScheduledCampaigns.bind(this), config.campaigns.checkIntervalMs);
    
    this.logger.info('Campaign Worker started');
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Campaign Worker');
    this.running = false;
    
    if (this.campaignInterval) {
      clearInterval(this.campaignInterval);
      this.campaignInterval = null;
    }
    
    await this.messageQueue.unsubscribe('campaign.execute');
    await this.messageQueue.unsubscribe('campaign.step.execute');
    await this.prisma.$disconnect();
    
    this.logger.info('Campaign Worker stopped');
  }

  private async handleCampaignExecution(message: any): Promise<void> {
    try {
      this.logger.info(`Received execution request for campaign ${message.campaignId}`);
      
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: message.campaignId },
        include: {
          steps: {
            orderBy: { sequence: 'asc' }
          },
          organization: true
        }
      });
      
      if (!campaign) {
        this.logger.error(`Campaign ${message.campaignId} not found`);
        return;
      }
      
      // Get target leads
      const leads = await this.getTargetLeadsForCampaign(campaign);
      this.logger.info(`Found ${leads.length} target leads for campaign ${campaign.id}`);
      
      // Create campaign executions for each lead
      for (const lead of leads) {
        await this.prisma.campaignExecution.create({
          data: {
            campaignId: campaign.id,
            leadId: lead.id,
            status: 'PENDING',
            currentStepIndex: 0
          }
        });
      }
      
      // Execute first step for all leads
      if (campaign.steps.length > 0) {
        const firstStep = campaign.steps[0];
        await this.messageQueue.publish('campaign.step.execute', {
          campaignId: campaign.id,
          stepId: firstStep.id,
          timestamp: new Date().toISOString()
        });
      }
      
      // Publish completion event
      await this.messageQueue.publish('campaign.execute.completed', {
        campaignId: campaign.id,
        leadsCount: leads.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error('Error handling campaign execution', error);
      
      // Publish error event
      await this.messageQueue.publish('campaign.execute.error', {
        campaignId: message.campaignId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async handleCampaignStepExecution(message: any): Promise<void> {
    try {
      this.logger.info(`Executing campaign step ${message.stepId} for campaign ${message.campaignId}`);
      
      const step = await this.prisma.campaignStep.findUnique({
        where: { id: message.stepId },
        include: {
          campaign: {
            include: { organization: true }
          }
        }
      });
      
      if (!step) {
        this.logger.error(`Campaign step ${message.stepId} not found`);
        return;
      }
      
      // Get all pending executions for this campaign at the current step
      const executions = await this.prisma.campaignExecution.findMany({
        where: {
          campaignId: message.campaignId,
          status: 'PENDING',
          currentStepIndex: step.sequence
        },
        include: {
          lead: true
        }
      });
      
      this.logger.info(`Found ${executions.length} executions for step ${step.id}`);
      
      for (const execution of executions) {
        await this.executeStepForLead(step, execution.lead);
        
        // Update execution status and move to next step
        await this.prisma.campaignExecution.update({
          where: { id: execution.id },
          data: {
            currentStepIndex: step.sequence + 1,
            lastExecutedAt: new Date()
          }
        });
      }
      
      // Check if there's a next step to execute
      const nextStep = await this.prisma.campaignStep.findFirst({
        where: {
          campaignId: message.campaignId,
          sequence: step.sequence + 1
        }
      });
      
      if (nextStep && step.delayHours) {
        // Schedule next step with delay
        setTimeout(async () => {
          await this.messageQueue.publish('campaign.step.execute', {
            campaignId: message.campaignId,
            stepId: nextStep.id,
            timestamp: new Date().toISOString()
          });
        }, step.delayHours * 60 * 60 * 1000);
      } else if (nextStep) {
        // Execute next step immediately
        await this.messageQueue.publish('campaign.step.execute', {
          campaignId: message.campaignId,
          stepId: nextStep.id,
          timestamp: new Date().toISOString()
        });
      } else {
        // No more steps, complete campaign
        await this.prisma.campaign.update({
          where: { id: message.campaignId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date()
          }
        });
        
        // Update remaining executions
        await this.prisma.campaignExecution.updateMany({
          where: {
            campaignId: message.campaignId,
            status: 'PENDING'
          },
          data: {
            status: 'COMPLETED',
            completedAt: new Date()
          }
        });
      }
      
    } catch (error) {
      this.logger.error('Error handling campaign step execution', error);
      
      // Publish error event
      await this.messageQueue.publish('campaign.step.execute.error', {
        stepId: message.stepId,
        campaignId: message.campaignId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async executeStepForLead(step: any, lead: any): Promise<void> {
    try {
      this.logger.info(`Executing step ${step.id} for lead ${lead.id}`);
      
      const { organization } = step.campaign;
      
      switch (step.type) {
        case 'EMAIL':
          await this.executeEmailStep(step, lead, organization);
          break;
        
        case 'TASK':
          await this.executeTaskStep(step, lead, organization);
          break;
        
        case 'WAIT':
          this.logger.info(`Step ${step.id} is a WAIT step, continuing`);
          break;
        
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }
      
      // Create step execution record
      await this.prisma.stepExecution.create({
        data: {
          stepId: step.id,
          leadId: lead.id,
          executedAt: new Date(),
          status: 'COMPLETED'
        }
      });
      
    } catch (error) {
      this.logger.error(`Failed to execute step ${step.id} for lead ${lead.id}`, error);
      
      // Create failed execution record
      await this.prisma.stepExecution.create({
        data: {
          stepId: step.id,
          leadId: lead.id,
          executedAt: new Date(),
          status: 'FAILED',
          error: error.message
        }
      });
      
      throw error;
    }
  }

  private async executeEmailStep(step: any, lead: any, organization: any): Promise<void> {
    try {
      this.logger.info(`Generating email for step ${step.id} to lead ${lead.id}`);
      
      // Get lead history and context
      const leadHistory = await this.prisma.leadInteraction.findMany({
        where: { leadId: lead.id },
        orderBy: { timestamp: 'asc' }
      });
      
      // Generate personalized email
      const emailContent = await this.emailAgent.generateEmail({
        lead,
        emailTemplate: step.emailTemplate,
        campaignContext: step.campaign.description,
        previousInteractions: leadHistory,
        organizationDetails: {
          name: organization.name,
          industry: organization.industry,
          productDescription: organization.productDescription
        }
      });
      
      // Send email
      const emailResult = await this.emailService.sendEmail({
        to: lead.email,
        from: step.fromEmail || organization.defaultFromEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        replyTo: step.replyToEmail || organization.defaultReplyToEmail,
        trackingId: `${step.id}-${lead.id}`
      });
      
      // Record email interaction
      await this.prisma.leadInteraction.create({
        data: {
          leadId: lead.id,
          type: 'EMAIL_SENT',
          channelId: 'EMAIL',
          content: emailContent.html,
          metadata: {
            emailId: emailResult.id,
            subject: emailContent.subject,
            campaignId: step.campaign.id,
            stepId: step.id
          },
          timestamp: new Date()
        }
      });
      
      this.logger.info(`Successfully sent email to lead ${lead.id}`);
      
    } catch (error) {
      this.logger.error(`Failed to send email for step ${step.id} to lead ${lead.id}`, error);
      throw error;
    }
  }

  private async executeTaskStep(step: any, lead: any, organization: any): Promise<void> {
    try {
      this.logger.info(`Creating task for step ${step.id} to lead ${lead.id}`);
      
      // Generate task description if needed
      let taskDescription = step.taskDescription;
      
      if (step.generateDynamicDescription) {
        taskDescription = await this.emailAgent.generateTaskDescription({
          lead,
          taskTemplate: step.taskTemplate,
          campaignContext: step.campaign.description
        });
      }
      
      // Assign task to user
      let assigneeId = step.assigneeId;
      
      if (!assigneeId) {
        // Find default assignee from organization
        const defaultAssignee = await this.prisma.user.findFirst({
          where: {
            organizationId: organization.id,
            isDefault: true
          }
        });
        
        assigneeId = defaultAssignee?.id;
      }
      
      // Create task
      await this.prisma.task.create({
        data: {
          title: step.taskTitle || `Follow up with ${lead.name}`,
          description: taskDescription,
          dueDate: new Date(Date.now() + (step.taskDueDays || 2) * 24 * 60 * 60 * 1000),
          priority: step.taskPriority || 'MEDIUM',
          status: 'OPEN',
          leadId: lead.id,
          assigneeId,
          organizationId: organization.id,
          campaignId: step.campaignId,
          stepId: step.id
        }
      });
      
      // Record task assignment interaction
      await this.prisma.leadInteraction.create({
        data: {
          leadId: lead.id,
          type: 'TASK_CREATED',
          channelId: 'SYSTEM',
          content: taskDescription,
          metadata: {
            campaignId: step.campaign.id,
            stepId: step.id,
            assigneeId
          },
          timestamp: new Date()
        }
      });
      
      this.logger.info(`Successfully created task for lead ${lead.id}`);
      
    } catch (error) {
      this.logger.error(`Failed to create task for step ${step.id} for lead ${lead.id}`, error);
      throw error;
    }
  }

  private async processScheduledCampaigns(): Promise<void> {
    if (!this.running) return;
    
    try {
      this.logger.info('Processing scheduled campaigns');
      
      // Find campaigns that are scheduled to start now
      const campaigns = await this.prisma.campaign.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledStartAt: {
            lte: new Date()
          }
        }
      });
      
      this.logger.info(`Found ${campaigns.length} campaigns to execute`);
      
      for (const campaign of campaigns) {
        // Update campaign status
        await this.prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            status: 'RUNNING',
            startedAt: new Date()
          }
        });
        
        // Trigger campaign execution
        await this.messageQueue.publish('campaign.execute', {
          campaignId: campaign.id,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      this.logger.error('Error processing scheduled campaigns', error);
    }
  }

  private async getTargetLeadsForCampaign(campaign: any): Promise<any[]> {
    // Build query based on campaign target criteria
    let whereClause: any = {
      organizationId: campaign.organizationId
    };
    
    if (campaign.targetCriteria) {
      // Process target criteria
      if (campaign.targetCriteria.minScore) {
        whereClause.score = {
          gte: campaign.targetCriteria.minScore
        };
      }
      
      if (campaign.targetCriteria.industries && campaign.targetCriteria.industries.length > 0) {
        whereClause.industry = {
          in: campaign.targetCriteria.industries
        };
      }
      
      if (campaign.targetCriteria.companySizes && campaign.targetCriteria.companySizes.length > 0) {
        whereClause.companySize = {
          in: campaign.targetCriteria.companySizes
        };
      }
      
      // Exclude leads that are already in this campaign
      whereClause.campaignExecutions = {
        none: {
          campaignId: campaign.id
        }
      };
      
      // Exclude leads based on exclusion criteria
      if (campaign.targetCriteria.excludeCampaignIds && campaign.targetCriteria.excludeCampaignIds.length > 0) {
        whereClause.campaignExecutions = {
          ...whereClause.campaignExecutions,
          none: {
            campaignId: {
              in: campaign.targetCriteria.excludeCampaignIds
            }
          }
        };
      }
    }
    
    // Query the leads
    const leads = await this.prisma.lead.findMany({
      where: whereClause,
      take: campaign.maxLeads || 100
    });
    
    return leads;
  }
}
