import { LLMConnector } from '../utils/llmConnector';
import { AgentMemory } from '../utils/agentMemory';
import { Logger } from '../utils/logger';

interface LeadData {
  id: string;
  name: string;
  email: string;
  company: string;
  title?: string;
  industry?: string;
  companySize?: string;
  website?: string;
  source: string;
  notes?: string;
  interactions?: Array<{
    type: string;
    timestamp: string;
    content: string;
    metadata?: Record<string, any>;
  }>;
  customFields?: Record<string, any>;
}

interface ScoringResult {
  score: number;
  reasoning: string;
  recommendations: string[];
  nextSteps: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    details?: string;
  }>;
}

export class LeadScoringAgent {
  private llm: LLMConnector;
  private memory: AgentMemory;
  private logger: Logger;
  private scoringCriteria: Record<string, number>;
  
  constructor() {
    this.llm = new LLMConnector();
    this.memory = new AgentMemory('lead-scoring');
    this.logger = new Logger('LeadScoringAgent');
    
    // Default scoring criteria - will be customizable by the organization
    this.scoringCriteria = {
      companySize: 20,
      industry: 15,
      engagement: 25,
      timeliness: 10,
      budget: 15,
      needs: 15
    };
  }
  
  /**
   * Score a lead based on available data and interactions
   */
  async scoreLead(lead: LeadData): Promise<ScoringResult> {
    try {
      this.logger.info(`Scoring lead: ${lead.id} - ${lead.name}`);
      
      // Get previous context for this lead if available
      const leadContext = await this.memory.getMemory(lead.id);
      
      // Prepare the prompt for the LLM
      const prompt = this.buildScoringPrompt(lead, leadContext);
      
      // Get the scoring result from the LLM
      // Assuming llm.complete takes an object with prompt, max_tokens, etc.
      const llmResponse = await this.llm.complete({
        prompt,
        max_tokens: 1000,
        temperature: 0.2,
        // response_format: { type: "json" } // Ensure your LLMConnector supports this exact format or adapt
      });
      
      // Parse the response
      // It's safer to try-catch JSON.parse and handle potential errors
      let result: ScoringResult;
      try {
        // The user expects the LLM to return a JSON string based on the prompt.
        // However, `llm.complete` might return a string that is not valid JSON or an object directly.
        // Adjusting based on a common scenario where `complete` returns a string that needs parsing.
        if (typeof llmResponse === 'string') {
          result = JSON.parse(llmResponse);
        } else if (typeof llmResponse === 'object' && llmResponse !== null) {
          // If llmResponse is already an object, assume it matches ScoringResult structure
          result = llmResponse as ScoringResult; 
        } else {
          throw new Error('LLM response is not a valid string or object.');
        }
      } catch (parseError: any) {
        this.logger.error(`Error parsing LLM response for lead ${lead.id}:`, parseError);
        this.logger.info(`Raw LLM Response for lead ${lead.id}:`, llmResponse);
        throw new Error(`Failed to parse LLM scoring response: ${parseError.message}`);
      }
      
      // Store the result in memory for future context
      await this.memory.saveMemory(lead.id, {
        timestamp: new Date().toISOString(),
        score: result.score,
        reasoning: result.reasoning,
        recommendations: result.recommendations
      });
      
      this.logger.info(`Lead ${lead.id} scored: ${result.score}/100`);
      
      return result;
    } catch (error: any) {
      this.logger.error(`Error scoring lead ${lead.id}:`, error.message);
      // To prevent crashing the entire process, consider returning a default/error result or re-throwing selectively
      // For now, re-throwing as per original logic.
      throw new Error(`Failed to score lead: ${error.message}`);
    }
  }
  
  /**
   * Build a prompt for the scoring model
   */
  private buildScoringPrompt(lead: LeadData, previousContext?: any): string {
    return `
You are an AI lead scoring specialist analyzing B2B sales leads for qualification.

Your task is to score the following lead on a scale of 0-100 based on their fit and likelihood to convert.

LEAD INFORMATION:
- Name: ${lead.name}
- Company: ${lead.company}
- Title: ${lead.title || 'Unknown'}
- Industry: ${lead.industry || 'Unknown'}
- Company Size: ${lead.companySize || 'Unknown'}
- Source: ${lead.source}
${lead.notes ? `- Notes: ${lead.notes}` : ''}

${lead.interactions && lead.interactions.length > 0 
  ? `INTERACTIONS:
${lead.interactions.map(i => 
      `- ${new Date(i.timestamp).toLocaleString()}: ${i.type} - ${i.content}`
    ).join('
')}`
  : 'INTERACTIONS: None recorded'
}

${lead.customFields ? `CUSTOM FIELDS:
${Object.entries(lead.customFields).map(([key, value]) => 
  `- ${key}: ${value}`
).join('
')}` : ''}

${previousContext ? `PREVIOUS SCORING CONTEXT:
${JSON.stringify(previousContext, null, 2)}` : ''}

SCORING CRITERIA AND WEIGHTS:
- Company size and fit (${this.scoringCriteria.companySize}%): Consider if the company size is in our target market.
- Industry relevance (${this.scoringCriteria.industry}%): How well does the industry align with our solutions?
- Engagement level (${this.scoringCriteria.engagement}%): Analyze the quality and quantity of interactions.
- Response timeliness (${this.scoringCriteria.timeliness}%): How quickly do they respond to outreach?
- Budget indicators (${this.scoringCriteria.budget}%): Any signals about budget availability?
- Pain points/needs (${this.scoringCriteria.needs}%): Evidence of needs our solution can address?

Please provide your analysis strictly in the following JSON format. Do not include any text outside of this JSON structure:
{
  "score": 0, // numerical score from 0-100
  "reasoning": "detailed explanation of the score",
  "recommendations": ["recommendation 1", "recommendation 2"], // array of 2-3 recommended actions to improve lead quality
  "nextSteps": [
    {
      "action": "specific action to take",
      "priority": "high", // "high", "medium", or "low"
      "details": "specifics of the action"
    }
  ]
}

Base your reasoning only on the information provided and general B2B sales principles. If information is missing, indicate how this affects your confidence in the score within the reasoning.
Ensure the output is a single, valid JSON object.
`;
  }
  
  /**
   * Update the scoring criteria
   */
  updateScoringCriteria(criteria: Partial<Record<string, number>>): void {
    this.scoringCriteria = { ...this.scoringCriteria, ...criteria };
    
    // Validate that weights add up to 100
    const total = Object.values(this.scoringCriteria).reduce((sum, weight) => sum + weight, 0);
    if (total !== 100) {
      this.logger.warn(`Scoring criteria weights sum to ${total}, not 100. This may cause unexpected results.`);
    }
    // Potentially, you might want to re-normalize weights here if they don't sum to 100, or throw an error.
  }
  
  /**
   * Reset agent memory for a lead
   */
  async resetMemory(leadId: string): Promise<void> {
    // Assuming AgentMemory class has a clearMemory method
    // If not, this might need to be memory.deleteMemory(leadId) or similar
    return this.memory.clearMemory(leadId); 
  }
}
