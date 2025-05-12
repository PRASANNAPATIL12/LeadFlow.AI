// packages/ai-engine/src/memory/agentMemory.ts
import { prisma } from '@agentic-sales/database';
import { logger } from '@agentic-sales/logger';

interface MemoryEntry {
  key: string;
  value: string;
  type: string;
  timestamp: Date;
  ttl?: Date;
}

export class AgentMemory {
  private agentType: string;

  constructor(agentType: string) {
    this.agentType = agentType;
  }

  async getContext(key: string): Promise<string | null> {
    try {
      // Find the memory entry
      const entry = await prisma.agentMemory.findFirst({
        where: {
          key,
          type: this.agentType,
          // Check if TTL is not expired or is null
          OR: [
            { ttl: { gt: new Date() } },
            { ttl: null }
          ]
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      if (!entry) {
        return null;
      }

      return entry.value;
    } catch (error) {
      logger.error('Error retrieving agent memory', { key, agentType: this.agentType, error });
      return null;
    }
  }

  async storeContext(key: string, value: string, ttlDays?: number): Promise<boolean> {
    try {
      // Calculate TTL date if specified
      let ttl: Date | undefined = undefined;
      if (ttlDays) {
        ttl = new Date();
        ttl.setDate(ttl.getDate() + ttlDays);
      }

      // Upsert the memory entry
      await prisma.agentMemory.upsert({
        where: {
          key_type: {
            key,
            type: this.agentType
          }
        },
        update: {
          value,
          timestamp: new Date(),
          ttl
        },
        create: {
          key,
          value,
          type: this.agentType,
          timestamp: new Date(),
          ttl
        }
      });

      return true;
    } catch (error) {
      logger.error('Error storing agent memory', { key, agentType: this.agentType, error });
      return false;
    }
  }

  async clearContext(key: string): Promise<boolean> {
    try {
      // Delete the memory entry
      await prisma.agentMemory.delete({
        where: {
          key_type: {
            key,
            type: this.agentType
          }
        }
      });

      return true;
    } catch (error) {
      logger.error('Error clearing agent memory', { key, agentType: this.agentType, error });
      return false;
    }
  }

  async getAllContextKeys(): Promise<string[]> {
    try {
      const entries = await prisma.agentMemory.findMany({
        where: {
          type: this.agentType,
          // Check if TTL is not expired or is null
          OR: [
            { ttl: { gt: new Date() } },
            { ttl: null }
          ]
        },
        select: {
          key: true
        }
      });

      return entries.map(entry => entry.key);
    } catch (error) {
      logger.error('Error retrieving agent memory keys', { agentType: this.agentType, error });
      return [];
    }
  }

  async clearAllContext(): Promise<boolean> {
    try {
      await prisma.agentMemory.deleteMany({
        where: {
          type: this.agentType
        }
      });

      return true;
    } catch (error) {
      logger.error('Error clearing all agent memory', { agentType: this.agentType, error });
      return false;
    }
  }
}