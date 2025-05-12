import { Logger } from '../../../packages/ai-engine/src/utils/logger';
import { MessageQueue } from '../../../packages/message-queue/src/index';
import { LeadScoringAgent } from '../../../packages/ai-engine/src/agents/leadScoringAgent';
import { PrismaClient } from '../../../packages/database/src/client';
import config from './config';

export class LeadScoringWorker {
  private logger: Logger;
  private messageQueue: MessageQueue;
  private prisma: PrismaClient;
  private scoringAgent: LeadScoringAgent;
  private running: boolean = false;
  private batchInterval: NodeJS.Timeout | null = null;

  constructor(messageQueue: MessageQueue) {
    this.logger = new Logger('LeadScoringWorker');
    this.messageQueue = messageQueue;
    this.prisma = new PrismaClient();
    this.scoringAgent = new LeadScoringAgent({
      modelName: config.ai.leadScoringModel,
      apiKey: config.ai.apiKey
    });
  }

  async start(): Promise<void> {
    this.logger.info('Starting Lead Scoring Worker');
    this.running = true;
    
    // Subscribe to scoring request events
    await this.messageQueue.subscribe('lead.score.request', this.handleScoringRequest.bind(this));
    
    // Start batch processing
    this.batchInterval = setInterval(this.processBatch.bind(this), config.leadScoring.batchIntervalMs);
    
    this.logger.info('Lead Scoring Worker started');
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Lead Scoring Worker');
    this.running = false;
    
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
    
    await this.messageQueue.unsubscribe('lead.score.request');
    await this.prisma.$disconnect();
    
    this.logger.info('Lead Scoring Worker stopped');
  }

  private async handleScoringRequest(message: any): Promise<void> {
    try {
      this.logger.info(`Received scoring request for lead ${message.leadId}`);
      
      const lead = await this.prisma.lead.findUnique({
        where: { id: message.leadId },
        include: {
          organization: true,
          activities: true,
          interactions: true
        }
      });
      
      if (!lead) {
        this.logger.error(`Lead ${message.leadId} not found`);
        return;
      }
      
      await this.scoreLead(lead);
      
      // Publish completion event
      await this.messageQueue.publish('lead.score.completed', {
        leadId: message.leadId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error('Error handling scoring request', error);
      
      // Publish error event
      await this.messageQueue.publish('lead.score.error', {
        leadId: message.leadId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async processBatch(): Promise<void> {
    if (!this.running) return;
    
    try {
      this.logger.info('Starting batch lead scoring');
      
      // Find leads that need scoring
      const leads = await this.prisma.lead.findMany({
        where: {
          OR: [
            { lastScoredAt: null },
            { lastScoredAt: { lt: new Date(Date.now() - config.leadScoring.rescoreAfterMs) } }
          ]
        },
        include: {
          organization: true,
          activities: true,
          interactions: true
        },
        take: config.leadScoring.batchSize
      });
      
      this.logger.info(`Found ${leads.length} leads to score`);
      
      for (const lead of leads) {
        await this.scoreLead(lead);
      }
      
      this.logger.info('Completed batch lead scoring');
    } catch (error) {
      this.logger.error('Error during batch lead scoring', error);
    }
  }

  private async scoreLead(lead: any): Promise<void> {
    try {
      this.logger.info(`Scoring lead ${lead.id} (${lead.email})`);
      
      // Prepare lead data for scoring
      const leadData = {
        basicInfo: {
          id: lead.id,
          email: lead.email,
          name: lead.name,
          company: lead.company,
          title: lead.title,
          industry: lead.industry,
          companySize: lead.companySize
        },
        activities: lead.activities.map(a => ({
          type: a.type,
          timestamp: a.timestamp,
          details: a.details
        })),
        interactions: lead.interactions.map(i => ({
          type: i.type,
          timestamp: i.timestamp,
          sentiment: i.sentiment,
          details: i.details
        }))
      };
      
      // Get organization scoring criteria
      const scoringCriteria = await this.prisma.scoringCriteria.findFirst({
        where: { organizationId: lead.organizationId }
      }) || config.leadScoring.defaultCriteria;
      
      // Score the lead
      const scoringResult = await this.scoringAgent.scoreLead(leadData, scoringCriteria);
      
      // Update lead with scores
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          score: scoringResult.overallScore,
          scoreComponents: scoringResult.scoreComponents,
          scoringExplanation: scoringResult.explanation,
          lastScoredAt: new Date(),
          recommendedActions: scoringResult.recommendedActions
        }
      });
      
      // Create scoring history record
      await this.prisma.leadScoringHistory.create({
        data: {
          leadId: lead.id,
          score: scoringResult.overallScore,
          scoreComponents: scoringResult.scoreComponents,
          explanation: scoringResult.explanation,
          timestamp: new Date()
        }
      });
      
      // If score exceeds threshold, trigger next actions
      if (scoringResult.overallScore >= scoringCriteria.highScoreThreshold) {
        await this.messageQueue.publish('lead.highscore', {
          leadId: lead.id,
          score: scoringResult.overallScore,
          recommendedActions: scoringResult.recommendedActions,
          timestamp: new Date().toISOString()
        });
      }
      
      this.logger.info(`Successfully scored lead ${lead.id} with score ${scoringResult.overallScore}`);
      
    } catch (error) {
      this.logger.error(`Failed to score lead ${lead.id}`, error);
      throw error;
    }
  }
}
