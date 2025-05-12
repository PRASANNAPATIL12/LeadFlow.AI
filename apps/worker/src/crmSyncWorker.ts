import { Logger } from '../../../packages/ai-engine/src/utils/logger';
import { MessageQueue } from '../../../packages/message-queue/src/index';
import { CRMConnectorFactory } from '../../../packages/crm-connectors/src/index';
import { PrismaClient } from '../../../packages/database/src/client';
import config from './config';

export class CRMSyncWorker {
  private logger: Logger;
  private messageQueue: MessageQueue;
  private prisma: PrismaClient;
  private running: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(messageQueue: MessageQueue) {
    this.logger = new Logger('CRMSyncWorker');
    this.messageQueue = messageQueue;
    this.prisma = new PrismaClient();
  }

  async start(): Promise<void> {
    this.logger.info('Starting CRM Sync Worker');
    this.running = true;
    
    // Subscribe to CRM sync events
    await this.messageQueue.subscribe('crm.sync.request', this.handleSyncRequest.bind(this));
    
    // Start periodic sync
    this.syncInterval = setInterval(this.performPeriodicSync.bind(this), config.crmSync.intervalMs);
    
    this.logger.info('CRM Sync Worker started');
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping CRM Sync Worker');
    this.running = false;
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    await this.messageQueue.unsubscribe('crm.sync.request');
    await this.prisma.$disconnect();
    
    this.logger.info('CRM Sync Worker stopped');
  }

  private async handleSyncRequest(message: any): Promise<void> {
    try {
      this.logger.info(`Received sync request for organization ${message.organizationId}`);
      
      const organization = await this.prisma.organization.findUnique({
        where: { id: message.organizationId },
        include: { crmIntegrations: true }
      });
      
      if (!organization) {
        this.logger.error(`Organization ${message.organizationId} not found`);
        return;
      }
      
      for (const integration of organization.crmIntegrations) {
        await this.syncCRMData(integration);
      }
      
      // Publish completion event
      await this.messageQueue.publish('crm.sync.completed', {
        organizationId: message.organizationId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error('Error handling sync request', error);
      
      // Publish error event
      await this.messageQueue.publish('crm.sync.error', {
        organizationId: message.organizationId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async performPeriodicSync(): Promise<void> {
    try {
      this.logger.info('Starting periodic CRM sync');
      
      const organizations = await this.prisma.organization.findMany({
        include: { crmIntegrations: true }
      });
      
      for (const organization of organizations) {
        for (const integration of organization.crmIntegrations) {
          // Skip if we shouldn't sync yet
          const lastSync = new Date(integration.lastSyncAt || 0);
          const now = new Date();
          const diffHours = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
          
          if (diffHours < integration.syncFrequencyHours) {
            continue;
          }
          
          await this.syncCRMData(integration);
        }
      }
      
      this.logger.info('Completed periodic CRM sync');
    } catch (error) {
      this.logger.error('Error during periodic sync', error);
    }
  }

  private async syncCRMData(integration: any): Promise<void> {
    try {
      this.logger.info(`Syncing data for integration ${integration.id} (${integration.crmType})`);
      
      const connector = CRMConnectorFactory.createConnector(
        integration.crmType,
        integration.credentials
      );
      
      // Sync leads
      const leads = await connector.getLeads(integration.lastSyncAt);
      for (const lead of leads) {
        await this.prisma.lead.upsert({
          where: {
            organizationId_externalId: {
              organizationId: integration.organizationId,
              externalId: lead.externalId
            }
          },
          update: {
            ...lead,
            lastSyncAt: new Date()
          },
          create: {
            ...lead,
            organizationId: integration.organizationId,
            lastSyncAt: new Date()
          }
        });
      }
      
      // Update last sync time
      await this.prisma.crmIntegration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date() }
      });
      
      this.logger.info(`Successfully synced ${leads.length} leads from ${integration.crmType}`);
      
    } catch (error) {
      this.logger.error(`Failed to sync CRM data for integration ${integration.id}`, error);
      throw error;
    }
  }
}
