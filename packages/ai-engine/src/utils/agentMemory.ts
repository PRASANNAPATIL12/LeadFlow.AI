import { Redis } from 'ioredis';
import { Logger } from './logger';

// Interface for what a memory record looks like. Adjust as needed.
interface MemoryRecord {
  timestamp: string;
  data: any; 
}

export class AgentMemory {
  private redis: Redis;
  private logger: Logger;
  private ttlSeconds: number; // Time-to-live in seconds
  private agentIdPrefix: string; // To namespace keys for different agents
  
  constructor(agentId: string, redisUrl?: string, ttlSeconds = 60 * 60 * 24 * 30) { // Default 30 day TTL
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(url, { 
        // Recommended: Add retry strategy for robustness
        retryStrategy(times) {
            const delay = Math.min(times * 50, 2000); // Exponential backoff
            return delay;
        },
        maxRetriesPerRequest: 3 // Don't retry forever on a single command
    });
    this.logger = new Logger(`AgentMemory:${agentId}`);
    this.ttlSeconds = ttlSeconds;
    this.agentIdPrefix = `agent:${agentId}:context`;

    this.redis.on('error', (err) => {
        this.logger.error(`Redis connection error for ${agentId}: ${err.message}`);
    });
    this.redis.on('connect', () => {
        this.logger.info(`Successfully connected to Redis for ${agentId}`);
    });
  }
  
  private formatKey(entityId: string): string {
    return `${this.agentIdPrefix}:${entityId}`;
  }

  async getContext(entityId: string): Promise<any | null> { // Return type can be more specific if context structure is known
    try {
      const key = this.formatKey(entityId);
      const data = await this.redis.get(key);
      
      if (!data) {
        this.logger.info(`No context found for entity ${entityId} with agent ${this.agentIdPrefix}`);
        return null;
      }
      
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Error retrieving context for entity ${entityId} (agent ${this.agentIdPrefix}): ${error.message}`);
      return null; // Or rethrow depending on desired error handling
    }
  }
  
  async updateContext(entityId: string, newContextData: any): Promise<void> {
    try {
      const key = this.formatKey(entityId);
      const existingContext = await this.getContext(entityId) || {};
      
      // Merge new data with existing data - this strategy might need adjustment
      // depending on how you want to manage context (e.g., append, overwrite parts)
      const updatedContext = {
        ...existingContext,
        ...newContextData,
        lastUpdated: new Date().toISOString()
      };
      
      await this.redis.set(
        key,
        JSON.stringify(updatedContext),
        'EX', 
        this.ttlSeconds
      );
      
      this.logger.info(`Context updated for entity ${entityId} (agent ${this.agentIdPrefix})`);
    } catch (error) {
      this.logger.error(`Error updating context for entity ${entityId} (agent ${this.agentIdPrefix}): ${error.message}`);
      throw new Error(`Failed to update memory for ${entityId}: ${error.message}`);
    }
  }
  
  async clearContext(entityId: string): Promise<void> {
    try {
      const key = this.formatKey(entityId);
      const result = await this.redis.del(key);
      if (result > 0) {
        this.logger.info(`Context cleared for entity ${entityId} (agent ${this.agentIdPrefix})`);
      } else {
        this.logger.info(`No context found to clear for entity ${entityId} (agent ${this.agentIdPrefix})`);
      }
    } catch (error) {
      this.logger.error(`Error clearing context for entity ${entityId} (agent ${this.agentIdPrefix}): ${error.message}`);
    }
  }
  
  // Summarization might be complex and LLM-dependent, so a simple version:
  async summarizeContext(entityId: string, llmConnector: LLMConnector): Promise<void> {
    try {
      const context = await this.getContext(entityId);
      if (!context || typeof context !== 'object' || Object.keys(context).length === 0) {
        this.logger.info(`No context to summarize for ${entityId}`);
        return;
      }
      
      const contextString = JSON.stringify(context);
      const contextSize = Buffer.from(contextString).length;

      // Define a threshold for summarization, e.g., 10KB. Adjust as needed.
      const SUMMARIZATION_THRESHOLD_BYTES = 10 * 1024; 

      if (contextSize < SUMMARIZATION_THRESHOLD_BYTES) {
        this.logger.info(`Context for ${entityId} is small enough (${contextSize} bytes), skipping summarization.`);
        return;
      }
      
      this.logger.info(`Summarizing large context (${contextSize} bytes) for entity ${entityId} (agent ${this.agentIdPrefix})`);
      
      const prompt = `
Summarize the following B2B sales lead context. Focus on key decisions, recent interactions, and overall sentiment. Be concise.

Context:
${contextString}

Provide a summary:
`;

      const summary = await llmConnector.complete(prompt);
      
      // Replace the old context with the summary and retain some recent, structured data if desired.
      // This is a simple replacement strategy; more sophisticated strategies might be needed.
      const newContext = {
        summary: summary,
        summaryTimestamp: new Date().toISOString(),
        // Optionally, keep a few recent raw interactions if your structure allows
        recentInteractions: Array.isArray(context.interactions) ? context.interactions.slice(-3) : [], 
        lastScore: context.lastScoring?.score || context.lastScore, // Preserve last known score
      };
      
      // Update with the new summarized context
      const key = this.formatKey(entityId);
      await this.redis.set(
        key,
        JSON.stringify(newContext),
        'EX',
        this.ttlSeconds
      );
      
      this.logger.info(`Context summarized and updated for entity ${entityId} (agent ${this.agentIdPrefix})`);
    } catch (error) {
      this.logger.error(`Error summarizing context for entity ${entityId} (agent ${this.agentIdPrefix}): ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.info(`Redis connection closed for agent ${this.agentIdPrefix}`);
    } catch (error) {
      this.logger.error(`Error disconnecting Redis for agent ${this.agentIdPrefix}: ${error.message}`);
    }
  }
}
