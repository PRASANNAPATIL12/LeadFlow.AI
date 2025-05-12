// packages/ai-engine/src/agents/outreachAgent.ts
import { OpenAI } from '@agentic-sales/llm-connector';
import { AgentMemory } from '../memory/agentMemory';
import { prisma } from '@agentic-sales/database';
import { logger } from '@agentic-sales/logger';

interface OutreachMessage {
  leadId: string;
  companyName: string;
  personName: string;
  personTitle?: string;
  personEmail: string;
  outreachType: 'initial' | 'follow_up' | 'meeting_request' | 'nurture';
  previousMessages?: Array<{
    content: string;
    direction: 'outbound' | 'inbound';
    timestamp: Date;
  }>;
  organizationId: string;
}

interface OutreachResponse {
  subject: string;
  body: string;
  suggestedFollowupDate?: Date;
  suggestedActions?: string[];
}

export class OutreachAgent {
  private llmClient: OpenAI;
  private memory: AgentMemory;

  constructor() {
    this.llmClient = new OpenAI();
    this.memory = new AgentMemory('outreach-agent');
  }

  async generateMessage(params: OutreachMessage): Promise<OutreachResponse> {
    logger.info('Generating outreach message', { 
      leadId: params.leadId, 
      outreachType: params.outreachType, 
      organizationId: params.organizationId 
    });

    try {
      // Get organization info and target customer profile
      const organization = await prisma.organization.findUnique({
        where: { id: params.organizationId },
        include: {
          products: true,
          targetCustomerProfile: true
        }
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Get lead details including AI analysis
      const lead = await prisma.lead.findUnique({
        where: { id: params.leadId },
        include: {
          company: true,
          aiAnalysis: true
        }
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      // Retrieve context from memory if available
      const contextKey = `lead:${params.leadId}:outreach`;
      const storedContext = await this.memory.getContext(contextKey);

      // Build system prompt
      const systemPrompt = `You are an AI assistant specializing in B2B sales outreach for ${organization.name}. 
      Your role is to generate personalized, compelling outreach emails to potential leads.
      
      Company Information:
      - Name: ${organization.name}
      - Description: ${organization.description || 'N/A'}
      - Products/Services: ${organization.products.map(p => p.name).join(', ') || 'N/A'}
      - Target Customer Profile: ${organization.targetCustomerProfile?.description || 'N/A'}
      
      Lead Information:
      - Name: ${params.personName}
      - Title: ${params.personTitle || 'Unknown'}
      - Company: ${params.companyName}
      - Email: ${params.personEmail}
      - AI Analysis: ${lead.aiAnalysis?.analysisText || 'No analysis available'}
      - Fit Score: ${lead.fitScore || 'Unknown'}
      - Intent Score: ${lead.intentScore || 'Unknown'}
      
      Email Guidelines:
      - Keep emails concise and value-focused
      - Personalize the content based on the lead's position, company, and industry
      - Focus on solving their problems rather than selling features
      - Include a clear, specific call-to-action
      - Maintain a professional but conversational tone
      - Do not use overly salesy or marketing language
      - Avoid clichés and generic statements
      
      Additional Context from Previous Interactions:
      ${storedContext || 'No previous context available'}
      
      ${params.previousMessages && params.previousMessages.length > 0 
        ? `Previous Communication History:
${params.previousMessages
          .map(m => `- ${m.direction === 'outbound' ? 'Sent' : 'Received'} on ${m.timestamp.toISOString()}: ${m.content.substring(0, 100)}...`)
          .join('\n')}`
        : 'No previous message history available.'}
      
      Please generate a ${params.outreachType} email to this lead.`;

      // Prepare user message based on outreach type
      let userPrompt = `Generate a personalized ${params.outreachType} email to ${params.personName} at ${params.companyName}.`;
      
      switch (params.outreachType) {
        case 'initial':
          userPrompt += ' This is the first contact with this lead.';
          break;
        case 'follow_up':
          userPrompt += ' This is a follow-up to previous outreach.';
          break;
        case 'meeting_request':
          userPrompt += ' Request a meeting or call to discuss our solution.';
          break;
        case 'nurture':
          userPrompt += ' Share valuable information to nurture this lead.';
          break;
      }
      
      userPrompt += ' Include both a subject line and email body.';

      // Call LLM
      const response = await this.llmClient.getCompletion({
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: 1000
      });

      // Parse the response
      const subject = this.extractSubject(response);
      const body = this.extractBody(response);
      
      // Store context for future reference
      const updatedContext = `Last outreach type: ${params.outreachType}
      Last subject: ${subject}
      Summary of content: ${body.substring(0, 100)}...
      Date: ${new Date().toISOString()}`;
      
      await this.memory.storeContext(contextKey, updatedContext);

      // Use LLM to suggest follow-up date and actions
      const suggestionsPrompt = `Based on the email you just generated and the lead information, suggest an appropriate follow-up date and 2-3 specific actions the sales rep should take after sending this email.`;
      
      const suggestionsResponse = await this.llmClient.getCompletion({
        systemPrompt,
        userPrompt: suggestionsPrompt,
        temperature: 0.7,
        maxTokens: 300
      });
      
      const followupDate = this.extractFollowupDate(suggestionsResponse);
      const suggestedActions = this.extractSuggestedActions(suggestionsResponse);

      return {
        subject,
        body,
        suggestedFollowupDate: followupDate,
        suggestedActions
      };
    } catch (error) {
      logger.error('Error generating outreach message', { 
        leadId: params.leadId, 
        error, 
        organizationId: params.organizationId 
      });
      throw error;
    }
  }

  private extractSubject(text: string): string {
    // Look for patterns like "Subject:" or "Subject Line:"
    const subjectMatch = text.match(/Subject(?:\s+Line)?:s*(.+?)(?:\n|$)/i);
    if (subjectMatch && subjectMatch[1]) {
      return subjectMatch[1].trim();
    }
    
    // If we can't find a subject line label, just use the first line if it's short
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines[0] && lines[0].length < 100 && !lines[0].toLowerCase().includes('body')) {
      return lines[0].trim();
    }
    
    return 'No subject extracted';
  }

  private extractBody(text: string): string {
    // Look for "Body:" or email body after subject
    const bodyMatch = text.match(/Body:s*(.+)/is);
    if (bodyMatch && bodyMatch[1]) {
      return bodyMatch[1].trim();
    }
    
    // If we can't find a body label, exclude the subject line and use the rest
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length > 1) {
      // Skip the first line (assumed to be subject) and join the rest
      return lines.slice(1).join('\n').trim();
    }
    
    return text.trim();
  }

  private extractFollowupDate(text: string): Date | undefined {
    // Look for date patterns in the text
    const datePatterns = [
      /follow(?:-|s)?up(?:\s+in|\s+after)?(?:\s+in)?(?:\s+about)?\s+(\d+)\s+(day|week)s?/i,
      /wait(?:\s+for)?\s+(\d+)\s+(day|week)s?/i,
      /after\s+(\d+)\s+(day|week)s?/i,
      /in\s+(\d+)\s+(day|week)s?/i
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[2]) {
        const number = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        
        const today = new Date();
        if (unit.startsWith('day')) {
          today.setDate(today.getDate() + number);
          return today;
        } else if (unit.startsWith('week')) {
          today.setDate(today.getDate() + (number * 7));
          return today;
        }
      }
    }
    
    // Default follow-up date if no specific time is extracted (3 days later)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    return defaultDate;
  }

  private extractSuggestedActions(text: string): string[] {
    const actions: string[] = [];
    
    // Look for numbered or bulleted lists
    const actionPattern = /(?:^\d+\.|\*|\-)\s*(.+?)(?:\n|$)/gm;
    let match;
    
    while ((match = actionPattern.exec(text)) !== null) {
      if (match[1] && match[1].trim().length > 0) {
        actions.push(match[1].trim());
      }
    }
    
    // If no list format is found, try to extract sentences that sound like actions
    if (actions.length === 0) {
      const actionVerbs = ['check', 'connect', 'send', 'research', 'follow', 'schedule', 'prepare', 'review'];
      
      const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0);
      
      for (const sentence of sentences) {
        const lowercaseSentence = sentence.toLowerCase().trim();
        if (actionVerbs.some(verb => lowercaseSentence.startsWith(verb))) {
          actions.push(sentence.trim());
        }
      }
    }
    
    return actions.slice(0, 3); // Return at most 3 actions
  }
}