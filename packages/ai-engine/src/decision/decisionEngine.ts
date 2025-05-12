import { prisma } from '@agentic-sales/database';
import { logger } from '@agentic-sales/logger';
import { LLMConnector } from '../utils/llmConnector';
import { AgentMemory } from '../memory/agentMemory';

interface DecisionContext {
  leadId?: string;
  companyId?: string;
  campaignId?: string;
  contactId?: string;
  actionType: string;
  previousActions?: any[];
  priorityLevel?: number;
  userPreferences?: Record<string, any>;
  marketData?: Record<string, any>;
}

interface DecisionResult {
  decision: string;
  confidence: number;
  reasoning: string;
  nextActions?: string[];
  recommendedDelay?: number;
}

export class DecisionEngine {
  private llm: LLMConnector;
  private memory: AgentMemory;
  
  constructor() {
    this.llm = new LLMConnector();
    this.memory = new AgentMemory('decision-engine');
  }
  
  async makeDecision(context: DecisionContext): Promise<DecisionResult> {
    try {
      logger.info('Making decision', { context });
      
      // Fetch historical context if available
      let historicalContext = '';
      if (context.leadId) {
        const leadMemory = await this.memory.getContext(`lead:${context.leadId}`);
        if (leadMemory) {
          historicalContext = `Previous interactions with this lead: ${leadMemory}
`;
        }
      }
      
      // Fetch company data if available
      let companyData = '';
      if (context.companyId) {
        const company = await prisma.company.findUnique({
          where: { id: context.companyId },
          include: {
            industry: true,
            technologies: true,
            leadScores: {
              orderBy: {
                timestamp: 'desc'
              },
              take: 1
            }
          }
        });
        
        if (company) {
          companyData = `Company Info: ${JSON.stringify(company)}
`;
        }
      }
      
      // Build the prompt for the LLM
      const prompt = `
      You are an AI sales agent making a decision about ${context.actionType}.
      
      ${historicalContext}
      ${companyData}
      
      Current context:
      ${JSON.stringify(context)}
      
      Based on this information, make a decision with the following format:
      - Decision: [your decision]
      - Confidence: [0-100]
      - Reasoning: [your reasoning]
      - Next Actions: [comma separated list of recommended next actions]
      - Recommended Delay: [time in hours before next action]
      `;
      
      const response = await this.llm.generateText(prompt);
      
      // Parse the LLM response
      const decisionMatch = response.match(/Decision: (.*)/);
      const confidenceMatch = response.match(/Confidence: (\d+)/);
      const reasoningMatch = response.match(/Reasoning: (.*?)(?=Next Actions:|Recommended Delay:|$)/s);
      const nextActionsMatch = response.match(/Next Actions: (.*?)(?=Recommended Delay:|$)/);
      const delayMatch = response.match(/Recommended Delay: (\d+)/);
      
      const result: DecisionResult = {
        decision: decisionMatch ? decisionMatch[1].trim() : 'No clear decision',
        confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 50,
        reasoning: reasoningMatch ? reasoningMatch[1].trim() : 'No reasoning provided',
        nextActions: nextActionsMatch ? nextActionsMatch[1].split(',').map(a => a.trim()) : [],
        recommendedDelay: delayMatch ? parseInt(delayMatch[1]) : 24
      };
      
      // Store the decision in memory for future context
      if (context.leadId) {
        const existingMemory = await this.memory.getContext(`lead:${context.leadId}`) || '';
        const updatedMemory = `${existingMemory}
[${new Date().toISOString()}] ${context.actionType} - Decision: ${result.decision}`;
        await this.memory.storeContext(`lead:${context.leadId}`, updatedMemory, 90); // Store for 90 days
      }
      
      logger.info('Decision made', { result });
      return result;
    } catch (error) {
      logger.error('Error in decision engine', { error, context });
      return {
        decision: 'Error',
        confidence: 0,
        reasoning: 'An error occurred during decision making'
      };
    }
  }
}