import { Logger } from './logger';

interface MemoryRecord {
  timestamp: string;
  data: any;
}

/**
 * Agent Memory system to store and retrieve context for AI agents
 * This version uses an in-memory Map and localStorage for simple persistence.
 */
export class AgentMemory {
  private agentId: string;
  private storageKey: string;
  private logger: Logger;
  private memoryStore: Map<string, MemoryRecord[]>;
  private maxMemoryItems: number;
  
  constructor(agentId: string, maxMemoryItems: number = 10) {
    this.agentId = agentId;
    this.storageKey = `agent_memory_${this.agentId}`; // Use agentId in storageKey for uniqueness
    this.logger = new Logger(`AgentMemory:${agentId}`);
    this.memoryStore = new Map<string, MemoryRecord[]>();
    this.maxMemoryItems = maxMemoryItems > 0 ? maxMemoryItems : 1; // Ensure maxMemoryItems is at least 1
    
    // Initialize from persistent storage if available (client-side)
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }
  
  /**
   * Save a memory item for a specific entity
   */
  async saveMemory(entityId: string, data: any): Promise<void> {
    if (!entityId) {
      this.logger.warn('Attempted to save memory with no entityId.');
      return;
    }
    try {
      const entityMemory = this.memoryStore.get(entityId) || [];
      
      const newMemory: MemoryRecord = {
        timestamp: new Date().toISOString(),
        data
      };
      
      // Add new memory to the beginning of the array (most recent first)
      entityMemory.unshift(newMemory);
      
      // Limit the number of items
      if (entityMemory.length > this.maxMemoryItems) {
        // entityMemory.pop(); // Removes the oldest if unshift is used
        entityMemory.splice(this.maxMemoryItems); // More explicit way to keep only maxMemoryItems
      }
      
      this.memoryStore.set(entityId, entityMemory);
      
      // Persist to storage (client-side)
      if (typeof window !== 'undefined') {
        this.saveToStorage();
      }
      
      this.logger.debug(`Memory saved for entity ${entityId}. Count: ${entityMemory.length}`);
    } catch (error: any) {
      this.logger.error(`Error saving memory for entity ${entityId}:`, error.message);
      throw error; // Re-throw to allow caller to handle
    }
  }
  
  /**
   * Get memory for a specific entity.
   * If limit is not provided, returns the most recent memory's data.
   * If limit is provided, returns an array of MemoryRecord objects up to that limit.
   */
  async getMemory(entityId: string, limit?: number): Promise<any | MemoryRecord[] | null> {
    if (!entityId) {
      this.logger.warn('Attempted to get memory with no entityId.');
      return null;
    }
    try {
      const entityMemory = this.memoryStore.get(entityId) || [];
      
      if (entityMemory.length === 0) {
        this.logger.debug(`No memory found for entity ${entityId}`);
        return null;
      }
      
      if (limit && limit > 0) {
        return entityMemory.slice(0, limit);
      }
      
      // Default: return just the most recent memory's data object
      return entityMemory[0].data;

    } catch (error: any) {
      this.logger.error(`Error retrieving memory for entity ${entityId}:`, error.message);
      throw error; // Re-throw to allow caller to handle
    }
  }
  
  /**
   * Clear memory for a specific entity
   */
  async clearMemory(entityId: string): Promise<void> {
    if (!entityId) {
      this.logger.warn('Attempted to clear memory with no entityId.');
      return;
    }
    try {
      this.memoryStore.delete(entityId);
      if (typeof window !== 'undefined') {
        this.saveToStorage(); // Update persistent storage after clearing
      }
      this.logger.debug(`Memory cleared for entity ${entityId}`);
    } catch (error: any) {
      this.logger.error(`Error clearing memory for entity ${entityId}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Clear all memory for this agent
   */
  async clearAllMemory(): Promise<void> {
    try {
      this.memoryStore.clear();
      if (typeof window !== 'undefined') {
        this.saveToStorage(); // Update persistent storage after clearing all
      }
      this.logger.debug(`All memory cleared for agent ${this.agentId}`);
    } catch (error: any) {
      this.logger.error(`Error clearing all memory for agent ${this.agentId}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Save memory to persistent storage (localStorage for browser environments)
   */
  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') {
      this.logger.debug('localStorage not available. Skipping persistent save.');
      return; // Not in a browser environment or localStorage is disabled
    }
    try {
      // Convert Map to serializable object for localStorage
      const serializedMemory: Record<string, MemoryRecord[]> = {};
      this.memoryStore.forEach((value, key) => {
        serializedMemory[key] = value;
      });
      
      localStorage.setItem(this.storageKey, JSON.stringify(serializedMemory));
      this.logger.debug(`Agent memory for ${this.agentId} persisted to localStorage.`);
    } catch (error: any) {
      this.logger.error(`Error saving agent memory to localStorage for ${this.agentId}:`, error.message);
      // Depending on the error (e.g., QuotaExceededError), you might want to implement more sophisticated handling
    }
  }
  
  /**
   * Load memory from persistent storage (localStorage for browser environments)
   */
  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      this.logger.debug('localStorage not available. Skipping load from storage.');
      return; // Not in a browser environment or localStorage is disabled
    }
    try {
      const storedMemory = localStorage.getItem(this.storageKey);
      if (storedMemory) {
        const parsedMemory: Record<string, MemoryRecord[]> = JSON.parse(storedMemory);
        this.memoryStore.clear(); // Clear current in-memory store before loading
        for (const key in parsedMemory) {
          if (Object.prototype.hasOwnProperty.call(parsedMemory, key)) {
            this.memoryStore.set(key, parsedMemory[key]);
          }
        }
        this.logger.info(`Agent memory for ${this.agentId} loaded from localStorage.`);
      } else {
        this.logger.info(`No persistent memory found in localStorage for agent ${this.agentId}.`);
      }
    } catch (error: any) {
      this.logger.error(`Error loading agent memory from localStorage for ${this.agentId}:`, error.message);
      // If parsing fails or data is corrupt, it might be good to clear the corrupted storage item
      // localStorage.removeItem(this.storageKey);
    }
  }
}
