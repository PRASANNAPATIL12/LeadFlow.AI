import { LLMConnector } from '../utils/llmConnector';
import { AgentMemory } from '../utils/agentMemory';
import { Logger } from '../utils/logger';
import { LeadDataFromFrontend as LeadData } from './leadScoringAgent'; // Reusing LeadData interface for consistency

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  variables: string[]; // e.g., ['{{name}}', '{{company}}']
  subjectTemplate: string;
  bodyTemplate: string; // Can contain HTML or markdown
}

interface EmailGenerationRequest {
  leadData: LeadData;
  templateId?: string; // Optional: Use a predefined template
  purpose: string; // e.g., "Initial outreach", "Follow-up after demo", "Meeting confirmation"
  customInstructions?: string; // Specific points to include or avoid
  senderProfile?: {
    name: string;
    title: string;
    companyName: string;
  };
}

interface EmailGenerationResult {
  subject: string;
  body: string; // Can be HTML or plain text depending on generation
  suggestedSendTime?: string; // e.g., "Tomorrow morning", "End of day"
  followUpRecommendation?: string; // e.g., "If no reply in 3 days, send a brief follow-up."
  personalizationAnalysis?: string[]; // List of personalization points used
}

export class EmailGenerationAgent {
  private llm: LLMConnector;
  private memory: AgentMemory;
  private logger: Logger;
  private templates: Map<string, EmailTemplate>; // In-memory store for templates
  
  constructor() {
    this.llm = new LLMConnector();
    this.memory = new AgentMemory('EmailGenerationAgent');
    this.logger = new Logger('EmailGenerationAgent');
    this.templates = new Map();
    
    this.loadDefaultTemplates();
  }
  
  private loadDefaultTemplates(): void {
    this.templates.set('initial_followup', {
      id: 'initial_followup',
      name: 'Initial Follow-up',
      description: 'First follow-up after initial contact or lead generation.',
      variables: ['leadName', 'leadCompany', 'senderName', 'valueProposition'],
      subjectTemplate: 'Following up from {{leadCompany}}',
      bodyTemplate: `Hi {{leadName}},

I hope this email finds you well. I wanted to follow up on our initial conversation about how [Your Company] can help {{leadCompany}} with {{valueProposition}}.

I'd love to schedule a brief call to discuss your specific needs and how we might be able to address them. Would you have 15-20 minutes this week for a quick chat?

Looking forward to hearing from you.

Best regards,
{{senderName}}`
    });
    
    this.templates.set('meeting_request', {
      id: 'meeting_request',
      name: 'Meeting Request',
      description: 'Request for a meeting or call after some engagement.',
      variables: ['leadName', 'leadCompany', 'painPoint', 'solution', 'senderName'],
      subjectTemplate: 'Quick chat regarding {{painPoint}} at {{leadCompany}}?',
      bodyTemplate: `Hi {{leadName}},

Based on our previous interactions, I understand that {{painPoint}} can be a challenge for companies like {{leadCompany}}. I believe our {{solution}} could be a great fit for your needs.

I'd like to schedule a 30-minute call to demonstrate how it works and answer any questions you might have. Would any of these times work for you?
- [Suggest Time 1]
- [Suggest Time 2]

Or feel free to suggest another time that works better for your schedule.

Best regards,
{{senderName}}`
    });
    // Add more default templates as needed
  }

  private applyTemplate(template: EmailTemplate, data: Record<string, string>): { subject: string; body: string } {
    let subject = template.subjectTemplate;
    let body = template.bodyTemplate;
    for (const variable of template.variables) {
        const placeholder = `{{${variable}}}`;
        const value = data[variable] || '[Information Not Provided]';
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
        body = body.replace(new RegExp(placeholder, 'g'), value);
    }
    return { subject, body };
  }
  
  async generateEmail(request: EmailGenerationRequest): Promise<EmailGenerationResult> {
    const { leadData, templateId, purpose, customInstructions, senderProfile } = request;
    this.logger.info(`Generating email for lead: ${leadData.id} (${leadData.name}) with purpose: ${purpose}`);
    
    try {
      const leadContext = await this.memory.getContext(leadData.id);
      let baseSubject = 'Follow-up';
      let baseBody = 'I hope this email finds you well.';

      const templateData = {
        leadName: leadData.name,
        leadCompany: leadData.company,
        senderName: senderProfile?.name || '[Your Name]',
        valueProposition: '[Your Core Value Proposition]', // This should be configurable or dynamically fetched
        painPoint: '[Relevant Pain Point]', // Ideally derived from lead data or interactions
        solution: '[Your Solution/Product]' // Ideally derived
      };

      if (templateId && this.templates.has(templateId)) {
        const template = this.templates.get(templateId)!;
        const applied = this.applyTemplate(template, templateData);
        baseSubject = applied.subject;
        baseBody = applied.body;
        this.logger.info(`Using template: ${template.name}`);
      }
      
      const prompt = this.buildEmailPrompt(leadData, purpose, leadContext, baseSubject, baseBody, customInstructions, senderProfile);
      
      const llmResponse = await this.llm.complete(prompt, { 
        // Consider specific LLM options for email generation if needed
        // modelName: 'gpt-3.5-turbo-instruct', // Example: a model good for instruction following
      }); 
      
      const emailResult = this.parseEmailResponse(llmResponse);
      
      await this.memory.updateContext(leadData.id, {
        lastGeneratedEmail: {
          timestamp: new Date().toISOString(),
          purpose,
          subject: emailResult.subject,
          // Storing a snippet of the body might be useful
          bodyPreview: emailResult.body.substring(0, 150) + '...',
          followUpRecommendation: emailResult.followUpRecommendation
        }
      });
      
      this.logger.info(`Email generated for lead ${leadData.id}: ${emailResult.subject}`);
      return emailResult;
    } catch (error) {
      this.logger.error(`Error generating email for lead ${leadData.id}: ${error.message}`);
      throw new Error(`Email generation failed: ${error.message}`);
    }
  }
  
  private buildEmailPrompt(
    leadData: LeadData, 
    purpose: string, 
    leadContext: any,
    baseSubject: string,
    baseBody: string,
    customInstructions?: string,
    senderProfile?: EmailGenerationRequest['senderProfile']
  ): string {
    const senderInfo = senderProfile ? `
## Sender Information
- Name: ${senderProfile.name}
- Title: ${senderProfile.title}
- Company: ${senderProfile.companyName}
` : '';

    return `
You are an expert B2B sales email writer for ${senderProfile?.companyName || 'a tech company'}. Your goal is to craft a personalized and effective email.

## Lead Information
- Name: ${leadData.name}
- Company: ${leadData.company}
- Position: ${leadData.position || 'Unknown'}
- Industry: ${leadData.industry || 'Unknown'}
- Company Size: ${leadData.companySize || 'Unknown'}

## Interaction History & Context (if available)
${leadData.interactions ? this.formatInteractions(leadData.interactions) : 'No interaction history provided.'}
${leadContext ? `Agent Memory Context: ${JSON.stringify(leadContext, null, 2)}` : 'No previous agent context available'}

## Email Task
- Purpose: ${purpose}
${customInstructions ? `- Custom Instructions: ${customInstructions}` : ''}

## Base Email Content (use as a starting point and personalize heavily)
Base Subject: ${baseSubject}
Base Body:
${baseBody}

${senderInfo}

Your task is to REWRITE and PERSONALIZE the base email content to achieve the stated purpose. Make it compelling and relevant to the lead.
Focus on their potential needs and how the sender's company can provide value.

Provide your response in VALID JSON format with the following structure:
{
  "subject": "[Your compelling and personalized subject line]",
  "body": "[Your fully crafted email body, including a personalized greeting and professional closing. Use 
 for newlines.]",
  "suggestedSendTime": "[e.g., Tuesday 10:00 AM lead's local time]",
  "followUpRecommendation": "[e.g., If no reply by Friday, send a short follow-up referencing a recent company achievement.]",
  "personalizationAnalysis": ["[Point 1 of personalization used, e.g., Mentioned their recent Series B funding]", "[Point 2 of personalization used, e.g., Referenced a common challenge in the ${leadData.industry || 'their'} industry]"]
}

Ensure the email body is ready to be sent.
`;
  }
  
  // Re-using from LeadScoringAgent - consider moving to a shared utility
  private formatInteractions(interactions?: Interaction[]): string {
    if (!interactions || interactions.length === 0) {
      return 'No previous interactions recorded.';
    }
    return interactions
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map(interaction => (
        `- ${new Date(interaction.timestamp).toLocaleDateString()}: ${interaction.type} - ${interaction.details.substring(0,100)}... (Sentiment: ${interaction.sentiment || 'N/A'})`
      )).join('
');
  }
  
  private parseEmailResponse(response: string): EmailGenerationResult {
    try {
      const parsed = JSON.parse(response);
      
      if (
        typeof parsed.subject !== 'string' ||
        typeof parsed.body !== 'string'
      ) {
        this.logger.warn('Invalid JSON structure in email generation response.', parsed);
        throw new Error('Invalid JSON structure in email generation response.');
      }
      
      return {
        subject: parsed.subject,
        body: parsed.body,
        suggestedSendTime: parsed.suggestedSendTime || 'ASAP',
        followUpRecommendation: parsed.followUpRecommendation || 'Follow up in 2-3 days if no response.',
        personalizationAnalysis: Array.isArray(parsed.personalizationAnalysis) ? parsed.personalizationAnalysis : []
      };
    } catch (error) {
      this.logger.error(`Failed to parse LLM email response: ${error.message}. Response was: ${response}`);
      throw new Error(`Could not parse email generation response: ${error.message}`);
    }
  }
  
  async addTemplate(template: EmailTemplate): Promise<void> {
    if (!template.id || !template.subjectTemplate || !template.bodyTemplate) {
        this.logger.error('Invalid template provided. ID, subjectTemplate, and bodyTemplate are required.', template);
        return;
    }
    this.templates.set(template.id, template);
    this.logger.info(`Email template "${template.name}" (ID: ${template.id}) added/updated.`);
  }
  
  getTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }
  
  getTemplate(id: string): EmailTemplate | undefined {
    return this.templates.get(id);
  }
}
