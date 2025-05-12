import { LLMConnector } from '../utils/llmConnector';
import { Logger } from '../utils/logger';

interface Conversation {
  participantA: string; // Usually the sales rep or AI agent
  participantB: string; // Usually the lead or prospect
  messages: Array<{ 
    sender: 'A' | 'B';
    timestamp: Date;
    content: string;
  }>;
  context?: {
    leadStage?: string;
    previousInteractions?: number;
    productDiscussed?: string;
  };
}

interface ConversationAnalysisResult {
  summary: string;
  sentimentScore: number; // -100 to 100, negative to positive
  leadInterestLevel: 'high' | 'medium' | 'low' | 'unknown';
  objections: string[];
  nextSteps: string[];
  keyInsights: string[];
  buyingSignals: string[];
  followUpRecommendation: string;
}

export class ConversationAnalysisAgent {
  private llm: LLMConnector;
  private logger: Logger;

  constructor() {
    this.llm = new LLMConnector();
    this.logger = new Logger('ConversationAnalysisAgent');
  }

  async analyzeConversation(conversation: Conversation): Promise<ConversationAnalysisResult> {
    try {
      const prompt = this.buildAnalysisPrompt(conversation);
      const response = await this.llm.complete(prompt, 'conversation-analysis');
      
      // Parse the LLM response
      const analysisResult = this.parseAnalysisResponse(response);
      
      this.logger.info(`Analyzed conversation between ${conversation.participantA} and ${conversation.participantB}`);
      
      return analysisResult;
    } catch (error) {
      this.logger.error(`Error analyzing conversation: ${error}`);
      throw new Error(`Failed to analyze conversation: ${error}`);
    }
  }

  private buildAnalysisPrompt(conversation: Conversation): string {
    const messageText = conversation.messages.map(msg => {
      const sender = msg.sender === 'A' ? conversation.participantA : conversation.participantB;
      const timestamp = new Date(msg.timestamp).toLocaleString();
      return `[${timestamp}] ${sender}: ${msg.content}`;
    }).join('

');
    
    return `
      Task: Analyze the following B2B sales conversation for insights, next steps, and recommendations.
      
      Conversation Context:
      - Sales Rep/Agent: ${conversation.participantA}
      - Prospect: ${conversation.participantB}
      ${conversation.context?.leadStage ? `- Lead Stage: ${conversation.context.leadStage}` : ''}
      ${conversation.context?.previousInteractions ? `- Previous Interactions: ${conversation.context.previousInteractions}` : ''}
      ${conversation.context?.productDiscussed ? `- Product Discussed: ${conversation.context.productDiscussed}` : ''}
      
      Conversation:
      ${messageText}
      
      Analyze this conversation for:
      1. Brief summary (2-3 sentences)
      2. Sentiment score (-100 to 100, where negative is negative sentiment and positive is positive sentiment)
      3. Lead interest level (high, medium, low, unknown)
      4. Objections raised by the prospect
      5. Recommended next steps
      6. Key insights about the prospect's needs or situation
      7. Buying signals (if any)
      8. Follow-up recommendation (timing and approach)
      
      Format output as valid JSON.
    `;
  }

  private parseAnalysisResponse(response: string): ConversationAnalysisResult {
    try {
      // Extract JSON from LLM response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON from LLM response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        summary: parsed.summary || 'No summary available',
        sentimentScore: typeof parsed.sentimentScore === 'number' ? parsed.sentimentScore : 0,
        leadInterestLevel: parsed.leadInterestLevel || 'unknown',
        objections: Array.isArray(parsed.objections) ? parsed.objections : [],
        nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
        keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
        buyingSignals: Array.isArray(parsed.buyingSignals) ? parsed.buyingSignals : [],
        followUpRecommendation: parsed.followUpRecommendation || '',
      };
    } catch (error) {
      this.logger.error(`Failed to parse analysis response: ${error}`);
      // Return default results if parsing fails
      return {
        summary: 'Failed to analyze conversation due to technical error',
        sentimentScore: 0,
        leadInterestLevel: 'unknown',
        objections: [],
        nextSteps: ['Review conversation manually'],
        keyInsights: [],
        buyingSignals: [],
        followUpRecommendation: 'Manual review required',
      };
    }
  }
}