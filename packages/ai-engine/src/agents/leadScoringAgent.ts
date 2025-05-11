import { LLMConnector } from '../utils/llmConnector';
import { AgentMemory } from '../utils/agentMemory';
import { Logger } from '../utils/logger';

export interface LeadDataFromFrontend {
  id: string;
  name: string;
  company: string;
  position?: string; // Made optional as per original definition
  email: string;
  phone?: string;
  industry?: string;
  companySize?: string;
  website?: string;
  linkedIn?: string;
  lastInteraction?: string; // Assuming this is a date string or description
  interactions?: Interaction[];
  crm_data?: any;
  previousScores?: {
    timestamp: string;
    score: number;
    reason: string;
  }[];
}

export interface Interaction {
  type: 'email' | 'call' | 'meeting' | 'website_visit' | 'content_download';
  timestamp: string;
  details: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface ScoringResult {
  score: number;
  confidence: number;
  reasoning: string;
  nextActions: RecommendedAction[];
  updatedAt: string;
}

export interface RecommendedAction {
  type: 'email' | 'call' | 'meeting' | 'content_share';
  priority: 'high' | 'medium' | 'low';
  reason: string;
  suggestedTiming: string;
}

export class LeadScoringAgent {
  private llm: LLMConnector;
  private memory: AgentMemory;
  private logger: Logger;
  
  constructor() {
    // Initialize with default options, or allow configuration
    this.llm = new LLMConnector(); 
    this.memory = new AgentMemory('LeadScoringAgent'); // AgentMemory now expects an agentId
    this.logger = new Logger('LeadScoringAgent');
  }
  
  async scoreLead(leadData: LeadDataFromFrontend): Promise<ScoringResult> {
    this.logger.info(`Scoring lead: ${leadData.id} - ${leadData.name} from ${leadData.company}`);
    
    try {
      // Retrieve previous context for this lead
      const previousContext = await this.memory.getContext(leadData.id);
      
      // Prepare the prompt for the LLM
      const prompt = this.buildScoringPrompt(leadData, previousContext);
      
      // Get the LLM response
      const llmResponse = await this.llm.complete(prompt);
      
      // Parse and validate the response
      const scoringResult = this.parseScoringResponse(llmResponse);
      
      // Store the context and result
      await this.memory.updateContext(leadData.id, {
        lastScoring: scoringResult,
        timestamp: new Date().toISOString(),
        leadSnapshot: leadData // Storing a snapshot of the lead data at the time of scoring
      });
      
      this.logger.info(`Lead ${leadData.id} scored: ${scoringResult.score} with confidence ${scoringResult.confidence}`);
      
      return scoringResult;
    } catch (error) {
      this.logger.error(`Error scoring lead ${leadData.id}: ${error.message}`);
      // Consider how to handle errors, e.g., return a default low score or throw
      throw new Error(`Lead scoring failed: ${error.message}`);
    }
  }
  
  private buildScoringPrompt(leadData: LeadDataFromFrontend, previousContext: any): string {
    // Build a comprehensive prompt
    return `
You are an expert B2B sales qualification AI. Analyze the following lead data and provide a lead score and next actions.

## Lead Information
- Name: ${leadData.name}
- Company: ${leadData.company}
- Position: ${leadData.position || 'Unknown'}
- Industry: ${leadData.industry || 'Unknown'}
- Company Size: ${leadData.companySize || 'Unknown'}
- Website: ${leadData.website || 'Not provided'}
- LinkedIn: ${leadData.linkedIn || 'Not provided'}

## Interaction History
${this.formatInteractions(leadData.interactions)}

## Previous Scoring Information
${this.formatPreviousScores(leadData.previousScores)}

## CRM Data
${leadData.crm_data ? JSON.stringify(leadData.crm_data, null, 2) : 'No CRM data provided'}

## Previous Context from Agent Memory
${previousContext ? JSON.stringify(previousContext, null, 2) : 'No previous context available'}

---

Based on this information, score this lead from 0-100 where:
- 0-20: Not a fit or very low probability of conversion
- 21-40: Low fit, minimal engagement
- 41-60: Moderate fit, requires nurturing
- 61-80: Good fit, engaged and showing interest
- 81-100: Excellent fit, highly engaged and likely to convert

For your response, provide:
1. A numerical score (0-100)
2. Your confidence in this score (0-100%)
3. Your detailed reasoning for this score (be specific about factors influencing the score)
4. Recommended next actions (up to 3, prioritized as high/medium/low)
5. Suggested timing for these actions (e.g., "within 24 hours", "next week")

Format your response as valid JSON with the following structure:
{
  "score": number,
  "confidence": number,
  "reasoning": "string",
  "nextActions": [
    {
      "type": "email"|"call"|"meeting"|"content_share",
      "priority": "high"|"medium"|"low",
      "reason": "string",
      "suggestedTiming": "string"
    }
  ]
}
`;
  }
  
  private formatInteractions(interactions?: Interaction[]): string {
    if (!interactions || interactions.length === 0) {
      return 'No previous interactions recorded.';
    }
    
    return interactions
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) // Sort by most recent first
      .map(interaction => {
        return `- ${new Date(interaction.timestamp).toLocaleDateString()}: ${interaction.type} - ${interaction.details} (Sentiment: ${interaction.sentiment || 'Not analyzed'})`;
      })
      .join('
');
  }
  
  private formatPreviousScores(scores?: { timestamp: string; score: number; reason: string }[]): string {
    if (!scores || scores.length === 0) {
      return 'No previous scoring history.';
    }
    
    return scores
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) // Sort by most recent first
      .map(score => {
        return `- ${new Date(score.timestamp).toLocaleDateString()}: Score ${score.score} - ${score.reason}`;
      })
      .join('
');
  }
  
  private parseScoringResponse(response: string): ScoringResult {
    try {
      const parsed = JSON.parse(response);
      
      // Validate the response structure
      if (
        typeof parsed.score !== 'number' ||
        parsed.score < 0 ||
        parsed.score > 100 ||
        typeof parsed.confidence !== 'number' ||
        parsed.confidence < 0 || 
        parsed.confidence > 100 ||
        typeof parsed.reasoning !== 'string' ||
        !Array.isArray(parsed.nextActions)
      ) {
        this.logger.warn('Invalid response format from LLM for lead scoring.', parsed);
        throw new Error('Invalid response format from LLM for lead scoring.');
      }
      
      // Further validation for nextActions items if needed
      parsed.nextActions.forEach(action => {
        if (!['email', 'call', 'meeting', 'content_share'].includes(action.type) || 
            !['high', 'medium', 'low'].includes(action.priority) || 
            typeof action.reason !== 'string' || 
            typeof action.suggestedTiming !== 'string') {
          this.logger.warn('Invalid nextAction item in LLM response.', action);
          throw new Error('Invalid nextAction item in LLM response.');
        }
      });

      return {
        ...parsed,
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to parse LLM scoring response: ${error.message}. Response was: ${response}`);
      // Fallback or re-throw, depending on desired error handling
      throw new Error(`Could not parse scoring response: ${error.message}`);
    }
  }
  
  // This method seems to be a duplicate of one in EmailGenerationAgent. 
  // Consider moving to a shared utility if it's identical or refactoring if it serves a different purpose here.
  async generateEmailContent(leadData: LeadDataFromFrontend, purpose: string): Promise<string> {
    this.logger.info(`Generating email for lead: ${leadData.id} with purpose: ${purpose}`);
    
    try {
      const previousContext = await this.memory.getContext(leadData.id);
      
      const prompt = `
You are an expert B2B sales professional writing an email to a potential lead.

## Lead Information
- Name: ${leadData.name}
- Company: ${leadData.company}
- Position: ${leadData.position || 'Unknown'}
- Industry: ${leadData.industry || 'Unknown'}

## Previous Interactions
${this.formatInteractions(leadData.interactions)}

## Purpose of this email
${purpose}

## Previous Lead Score
${leadData.previousScores && leadData.previousScores.length > 0 ? leadData.previousScores[0].score : 'No previous score'}

Write a personalized, professional email for this lead that is:
1. Concise and respectful of their time
2. Focused on value proposition relevant to their industry and role
3. Contains a clear call to action
4. Uses a conversational, not overly formal tone
5. Does not use generic templates or obvious sales language

Email content only, no subject line needed:
`;

      const emailContent = await this.llm.complete(prompt);
      
      // Log and update memory
      await this.memory.updateContext(leadData.id, {
        lastEmailGenerated: {
          timestamp: new Date().toISOString(),
          purpose,
          contentPreview: emailContent.substring(0, 100) + '...' // Store just a preview
        }
      });
      
      return emailContent;
    } catch (error) {
      this.logger.error(`Error generating email for lead ${leadData.id}: ${error.message}`);
      throw new Error(`Email generation failed: ${error.message}`);
    }
  }
}
