import { LLMConnector } from '../utils/llmConnector';
import { AgentMemory } from '../utils/agentMemory';
import { Logger } from '../utils/logger';

interface LeadData {
  companyName: string;
  industry: string;
  employeeCount: number;
  revenue?: string;
  website?: string;
  location?: string;
  contactTitle?: string;
  lastInteractionDate?: Date;
  interactions?: Array<{ 
    type: string;
    content: string;
    timestamp: Date;
  }>;
  demographics?: Record<string, any>;
}

interface QualificationResult {
  score: number;
  reasoning: string;
  fitScore: number;
  intentScore: number;
  authorityScore: number;
  budgetScore: number;
  timelineScore: number;
  nextSteps: string[];
  idealCustomerFitExplanation: string;
}

export class LeadQualificationAgent {
  private llm: LLMConnector;
  private memory: AgentMemory;
  private logger: Logger;
  private qualificationCriteria: Record<string, any>;

  constructor(
    organizationId: string,
    qualificationCriteria?: Record<string, any>
  ) {
    this.llm = new LLMConnector();
    this.memory = new AgentMemory(`lead-qualification-${organizationId}`);
    this.logger = new Logger('LeadQualificationAgent');
    this.qualificationCriteria = qualificationCriteria || {
      industryFit: ['software', 'healthcare', 'finance', 'education', 'manufacturing'],
      minEmployeeCount: 50,
      minRevenue: '$1M',
      idealTitles: ['CEO', 'CTO', 'CMO', 'VP', 'Director'],
    };
  }

  async qualifyLead(leadData: LeadData): Promise<QualificationResult> {
    try {
      // Get previous context for this lead
      const memoryContext = await this.memory.get(leadData.companyName);
      
      const prompt = this.buildQualificationPrompt(leadData, memoryContext);
      const response = await this.llm.complete(prompt, 'lead-qualification');
      
      // Parse the LLM response into structured qualification result
      const qualificationResult = this.parseQualificationResponse(response);
      
      // Store reasoning and scores in memory
      await this.memory.store(leadData.companyName, {
        lastQualification: new Date(),
        score: qualificationResult.score,
        reasoning: qualificationResult.reasoning,
      });
      
      this.logger.info(`Qualified lead: ${leadData.companyName} with score ${qualificationResult.score}`);
      
      return qualificationResult;
    } catch (error) {
      this.logger.error(`Error qualifying lead ${leadData.companyName}: ${error}`);
      throw new Error(`Failed to qualify lead: ${error}`);
    }
  }

  private buildQualificationPrompt(leadData: LeadData, memoryContext?: any): string {
    return `
      Task: Qualify the following B2B sales lead based on BANT (Budget, Authority, Need, Timeline) criteria.
      
      Organization Qualification Criteria:
      - Target Industries: ${this.qualificationCriteria.industryFit.join(',')}
      - Minimum Employee Count: ${this.qualificationCriteria.minEmployeeCount}
      - Minimum Revenue: ${this.qualificationCriteria.minRevenue}
      - Ideal Decision Maker Titles: ${this.qualificationCriteria.idealTitles.join(',')}
      
      Lead Information:
      - Company: ${leadData.companyName}
      - Industry: ${leadData.industry}
      - Employee Count: ${leadData.employeeCount}
      - Revenue: ${leadData.revenue || 'Unknown'}
      - Website: ${leadData.website || 'Unknown'}
      - Contact Title: ${leadData.contactTitle || 'Unknown'}
      - Location: ${leadData.location || 'Unknown'}
      ${leadData.interactions ? `- Recent Interactions: ${JSON.stringify(leadData.interactions)}` : ''}
      ${leadData.demographics ? `- Additional Demographics: ${JSON.stringify(leadData.demographics)}` : ''}
      
      ${memoryContext ? `Previous Analysis: ${JSON.stringify(memoryContext)}` : ''}
      
      Evaluate this lead for:
      1. Fit Score (1-100): How well does this company match our ideal customer profile?
      2. Intent Score (1-100): How strong is their buying intent based on interactions?
      3. Authority Score (1-100): Is the contact a decision maker or influencer?
      4. Budget Score (1-100): Are they likely to have the budget for our solution?
      5. Timeline Score (1-100): Are they likely to buy within the next 3 months?
      
      Provide an overall score (1-100) and detailed reasoning for each category.
      Recommend specific next steps based on your analysis.
      Format output as valid JSON.
    `;
  }

  private parseQualificationResponse(response: string): QualificationResult {
    try {
      // Extract JSON from LLM response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON from LLM response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and construct qualification result
      return {
        score: parsed.overallScore || 0,
        reasoning: parsed.reasoning || '',
        fitScore: parsed.fitScore || 0,
        intentScore: parsed.intentScore || 0,
        authorityScore: parsed.authorityScore || 0,
        budgetScore: parsed.budgetScore || 0,
        timelineScore: parsed.timelineScore || 0,
        nextSteps: parsed.nextSteps || [],
        idealCustomerFitExplanation: parsed.idealCustomerFitExplanation || '',
      };
    } catch (error) {
      this.logger.error(`Failed to parse qualification response: ${error}`);
      // Return default results if parsing fails
      return {
        score: 0,
        reasoning: 'Failed to analyze lead due to technical error',
        fitScore: 0,
        intentScore: 0,
        authorityScore: 0,
        budgetScore: 0,
        timelineScore: 0,
        nextSteps: ['Review lead data manually'],
        idealCustomerFitExplanation: '',
      };
    }
  }

  async updateQualificationCriteria(criteria: Record<string, any>): Promise<void> {
    this.qualificationCriteria = {
      ...this.qualificationCriteria,
      ...criteria,
    };
    this.logger.info('Updated qualification criteria');
  }
}