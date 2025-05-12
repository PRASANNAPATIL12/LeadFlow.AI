Email Generation Agent Implementation

// packages/ai-engine/src/agents/emailGenerationAgent.ts
import { prisma } from '@agentic-sales/database';
import { logger } from '@agentic-sales/logger';
import { LLMConnector } from '../utils/llmConnector';
import { AgentMemory } from '../memory/agentMemory';

interface EmailGenerationOptions {
  leadId: string;
  contactId: string;
  campaignId?: string;
  purpose: 'introduction' | 'follow-up' | 'meeting-request' | 'information' | 'custom';
  customContext?: string;
  tone?: 'formal' | 'conversational' | 'friendly' | 'urgent';
  lengthPreference?: 'short' | 'medium' | 'long';
  includeCTA?: boolean;
  ctaType?: 'meeting' | 'demo' | 'download' | 'response' | 'custom';
  ctaCustomText?: string;
}

interface EmailResult {
  subject: string;
  body: string;
  greeting: string;
  signature: string;
  personalizationPoints: string[];
  suggestedSendTime: Date;
}

export class EmailGenerationAgent {
  private llm: LLMConnector;
  private memory: AgentMemory;
  
  constructor() {
    this.llm = new LLMConnector();
    this.memory = new AgentMemory('email-generation');
  }
  
  async generateEmail(options: EmailGenerationOptions): Promise<EmailResult> {
    try {
      logger.info('Generating email', { options });
      
      // Fetch lead and contact data
      const lead = await prisma.lead.findUnique({
        where: { id: options.leadId },
        include: {
          company: {
            include: {
              industry: true
            }
          },
          scores: {
            orderBy: {
              timestamp: 'desc'
            },
            take: 1
          }
        }
      });
      
      const contact = await prisma.contact.findUnique({
        where: { id: options.contactId },
        include: {
          interactions: {
            orderBy: {
              timestamp: 'desc'
            },
            take: 5
          }
        }
      });
      
      if (!lead || !contact) {
        throw new Error('Lead or contact not found');
      }
      
      // Fetch user (sender) info
      const user = await prisma.user.findFirst({
        where: {
          leads: {
            some: {
              id: options.leadId
            }
          }
        }
      });
      
      if (!user) {
        throw new Error('Lead owner not found');
      }
      
      // Get campaign info if available
      let campaignInfo = {};
      if (options.campaignId) {
        const campaign = await prisma.campaign.findUnique({
          where: { id: options.campaignId }
        });
        
        if (campaign) {
          campaignInfo = {
            name: campaign.name,
            description: campaign.description,
            targetAudience: campaign.targetAudience
          };
        }
      }
      
      // Check for past interactions
      const pastEmails = await prisma.interaction.findMany({
        where: {
          leadId: options.leadId,
          contactId: options.contactId,
          type: 'email'
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 3
      });
      
      // Build the prompt for the LLM
      const prompt = `
      You are an AI email generation assistant for B2B sales. Generate a personalized email based on the following information:
      
      Lead Information:
      - Company: ${lead.company.name}
      - Industry: ${lead.company.industry?.name || 'Unknown'}
      - Current Score: ${lead.scores[0]?.score || 'Unknown'}
      
      Contact Information:
      - Name: ${contact.name}
      - Title: ${contact.title || 'Unknown'}
      - Email: ${contact.email}
      
      Sender Information:
      - Name: ${user.name}
      - Title: ${user.title || 'Sales Representative'}
      - Company: ${user.companyName || 'Our Company'}
      
      Email Purpose: ${options.purpose}
      ${options.customContext ? `Additional Context: ${options.customContext}` : ''}
      Tone Preference: ${options.tone || 'conversational'}
      Length Preference: ${options.lengthPreference || 'medium'}
      Include Call to Action: ${options.includeCTA ? 'Yes' : 'No'}
      ${options.includeCTA ? `CTA Type: ${options.ctaType}` : ''}
      ${options.ctaCustomText ? `Custom CTA Text: ${options.ctaCustomText}` : ''}
      
      Campaign Information:
      ${JSON.stringify(campaignInfo)}
      
      Past Interactions:
      ${pastEmails.map(email => `
      Date: ${email.timestamp}
      Subject: ${email.subject || 'Unknown'}
      Summary: ${email.summary || 'No summary available'}
      `).join('
'}
      
      Generate a complete email with the following components:
      1. Subject line that will get opened
      2. Personalized greeting
      3. Email body (${options.lengthPreference || 'medium'} length) with personalization
      4. ${options.includeCTA ? 'Clear call-to-action' : 'Soft closing'}
      5. Professional signature
      
      Format your response as:
      - Subject: [subject line]
      - Greeting: [greeting]
      - Body: [email body]
      - Signature: [signature]
      - Personalization Points: [comma-separated list of personalization elements used]
      - Suggested Send Time: [best time to send this email]
      `;
      
      const response = await this.llm.generateText(prompt);
      
      // Parse the LLM response
      const subjectMatch = response.match(/Subject: (.*?)(?=
|$)/);
      const greetingMatch = response.match(/Greeting: (.*?)(?=
|$)/);
      const bodyMatch = response.match(/Body: (.*?)(?=Signature:|$)/s);
      const signatureMatch = response.match(/Signature: (.*?)(?=Personalization Points:|$)/s);
      const personalizationMatch = response.match(/Personalization Points: (.*?)(?=Suggested Send Time:|$)/);
      const sendTimeMatch = response.match(/Suggested Send Time: (.*?)(?=$)/);
      
      const result: EmailResult = {
        subject: subjectMatch ? subjectMatch[1].trim() : 'No subject generated',
        greeting: greetingMatch ? greetingMatch[1].trim() : 'Hello, ',
        body: bodyMatch ? bodyMatch[1].trim() : 'No body generated',
        signature: signatureMatch ? signatureMatch[1].trim() : `

Best,
${user.name}`,
        personalizationPoints: personalizationMatch ? 
          personalizationMatch[1].split(',').map(p => p.trim()) : 
          ['No personalization points identified'],
        suggestedSendTime: sendTimeMatch ? new Date(sendTimeMatch[1].trim()) : new Date()
      };
      
      // Store in memory for future reference
      await this.memory.storeContext(
        `lead:${options.leadId}:contact:${options.contactId}:lastEmail`, 
        JSON.stringify({ 
          timestamp: new Date(),
          subject: result.subject,
          summary: result.body.substring(0, 100) + '...'
        }),
        30
      );
      
      // Create interaction record
      await prisma.interaction.create({
        data: {
          leadId: options.leadId,
          contactId: options.contactId,
          userId: user.id,
          type: 'email',
          channel: 'outbound',
          subject: result.subject,
          content: `${result.greeting}

${result.body}

${result.signature}`,
          summary: `Email: ${result.subject}`,
          status: 'draft',
          timestamp: new Date()
        }
      });
      
      logger.info('Email generated successfully', { leadId: options.leadId, contactId: options.contactId });
      return result;
    } catch (error) {
      logger.error('Error generating email', { options, error });
      throw error;
    }
  }
}