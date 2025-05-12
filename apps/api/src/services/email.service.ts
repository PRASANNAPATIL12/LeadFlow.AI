import nodemailer from 'nodemailer';
import { Logger } from '../../../../packages/ai-engine/src/utils/logger';
import { AgentMemory } from '../../../../packages/ai-engine/src/utils/agentMemory';
import { EmailGenerationAgent } from '../../../../packages/ai-engine/src/agents/emailGenerationAgent';
import { QueueNames, MessageQueue } from '../../../../packages/message-queue/src/index';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

interface EmailParams {
  to: string;
  subject: string;
  body: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: any[];
  isHtml?: boolean;
  replyToEmailId?: string;
  leadId?: string;
  campaignId?: string;
}

interface EmailTrackingData {
  emailId: string;
  leadId?: string;
  campaignId?: string;
  sentAt: Date;
  opens: number;
  clicks: number;
  replies: number;
  lastOpenAt?: Date;
  lastClickAt?: Date;
  lastReplyAt?: Date;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private defaultFrom: string;
  private logger: Logger;
  private agentMemory: AgentMemory;
  private emailGenerationAgent: EmailGenerationAgent;
  private messageQueue: MessageQueue;
  private templates: Map<string, EmailTemplate> = new Map();
  private emailTracking: Map<string, EmailTrackingData> = new Map();
  
  constructor(
    smtpConfig: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      }
    },
    defaultFrom: string,
    messageQueue: MessageQueue
  ) {
    this.transporter = nodemailer.createTransport(smtpConfig);
    this.defaultFrom = defaultFrom;
    this.logger = new Logger('EmailService');
    this.agentMemory = new AgentMemory('email_service', 20);
    this.emailGenerationAgent = new EmailGenerationAgent();
    this.messageQueue = messageQueue;
    
    // Initialize email queue consumer
    this.initializeQueueConsumer();
  }
  
  /**
   * Initialize the email queue consumer
   */
  private async initializeQueueConsumer(): Promise<void> {
    try {
      await this.messageQueue.consumeMessages(
        QueueNames.EMAIL_GENERATION,
        async (message) => {
          const { type, payload } = message;
          
          switch (type) {
            case 'generate_email':
              await this.handleGenerateEmailRequest(payload);
              break;
            case 'send_email':
              await this.handleSendEmailRequest(payload);
              break;
            default:
              this.logger.warn(`Unknown message type in email queue: ${type}`);
          }
        },
        { prefetch: 5 }
      );
    } catch (error) {
      this.logger.error('Failed to initialize email queue consumer:', error);
    }
  }
  
  /**
   * Handle generate email request from the queue
   */
  private async handleGenerateEmailRequest(payload: any): Promise<void> {
    try {
      const { leadId, context, templateId, emailType } = payload;
      
      // Get lead memory context if available
      const leadContext = await this.agentMemory.getMemory(leadId);
      
      // Generate email content
      const emailContent = await this.emailGenerationAgent.generateEmail({
        leadId,
        leadContext: leadContext || {},
        additionalContext: context,
        emailType,
        templateId
      });
      
      // Save the generated email to memory
      await this.agentMemory.saveMemory(leadId, {
        type: 'generated_email',
        content: emailContent
      });
      
      // Queue the email for sending if requested
      if (payload.sendImmediately) {
        await this.messageQueue.sendMessage(QueueNames.EMAIL_GENERATION, {
          id: `send-${leadId}-${Date.now()}`,
          type: 'send_email',
          payload: {
            to: payload.to,
            subject: emailContent.subject,
            body: emailContent.body,
            leadId,
            campaignId: payload.campaignId
          },
          timestamp: new Date().toISOString()
        });
      }
      
      this.logger.info(`Email generated for lead ${leadId}`);
    } catch (error) {
      this.logger.error('Error handling generate email request:', error);
    }
  }
  
  /**
   * Handle send email request from the queue
   */
  private async handleSendEmailRequest(payload: EmailParams): Promise<void> {
    try {
      await this.sendEmail(payload);
    } catch (error) {
      this.logger.error('Error handling send email request:', error);
    }
  }
  
  /**
   * Send an email
   */
  async sendEmail(params: EmailParams): Promise<string> {
    try {
      const { to, subject, body, from, cc, bcc, attachments, isHtml, leadId, campaignId } = params;
      
      const mailOptions = {
        from: from || this.defaultFrom,
        to,
        subject,
        [isHtml ? 'html' : 'text']: body,
        cc,
        bcc,
        attachments,
        headers: {
          'X-Lead-ID': leadId,
          'X-Campaign-ID': campaignId
        }
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      
      // Track the email
      const emailId = info.messageId;
      this.trackEmail({
        emailId,
        leadId,
        campaignId,
        sentAt: new Date(),
        opens: 0,
        clicks: 0,
        replies: 0
      });
      
      // Save to memory if leadId provided
      if (leadId) {
        await this.agentMemory.saveMemory(leadId, {
          type: 'sent_email',
          emailId,
          subject,
          sentAt: new Date().toISOString()
        });
      }
      
      this.logger.info(`Email sent to ${to} with id ${emailId}`);
      return emailId;
    } catch (error) {
      this.logger.error('Error sending email:', error);
      throw error;
    }
  }
  
  /**
   * Generate an email using AI for a lead
   */
  async generateEmailForLead(
    leadId: string,
    context: any,
    emailType: string,
    templateId?: string
  ): Promise<{ subject: string; body: string }> {
    try {
      // Queue the email generation task
      await this.messageQueue.sendMessage(QueueNames.EMAIL_GENERATION, {
        id: `generate-${leadId}-${Date.now()}`,
        type: 'generate_email',
        payload: {
          leadId,
          context,
          templateId,
          emailType,
          sendImmediately: false
        },
        timestamp: new Date().toISOString()
      });
      
      // For synchronous use, directly generate the email as well
      const leadContext = await this.agentMemory.getMemory(leadId);
      
      const emailContent = await this.emailGenerationAgent.generateEmail({
        leadId,
        leadContext: leadContext || {},
        additionalContext: context,
        emailType,
        templateId
      });
      
      return emailContent;
    } catch (error) {
      this.logger.error(`Error generating email for lead ${leadId}:`, error);
      throw error;
    }
  }
  
  /**
   * Track email engagement
   */
  private trackEmail(data: EmailTrackingData): void {
    this.emailTracking.set(data.emailId, data);
  }
  
  /**
   * Update email tracking data (for opens, clicks, replies)
   */
  async updateEmailTracking(
    emailId: string,
    updates: {
      opens?: number;
      clicks?: number;
      replies?: number;
      lastOpenAt?: Date;
      lastClickAt?: Date;
      lastReplyAt?: Date;
    }
  ): Promise<void> {
    try {
      const trackingData = this.emailTracking.get(emailId);
      
      if (!trackingData) {
        this.logger.warn(`No tracking data found for email ${emailId}`);
        return;
      }
      
      const updatedData = {
        ...trackingData,
        ...updates
      };
      
      this.emailTracking.set(emailId, updatedData);
      
      this.logger.debug(`Updated tracking data for email ${emailId}`);
    } catch (error) {
      this.logger.error(`Error updating email tracking for ${emailId}:`, error);
    }
  }
}
