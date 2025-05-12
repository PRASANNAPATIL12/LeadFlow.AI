import { Integration, IIntegration } from '../models/integration.model';

export class IntegrationService {
  async create(integrationData: Partial<IIntegration>): Promise<IIntegration> {
    const integration = new Integration(integrationData);
    return await integration.save();
  }

  async findById(id: string): Promise<IIntegration | null> {
    return await Integration.findById(id);
  }

  async findByOrganization(organizationId: string): Promise<IIntegration[]> {
    return await Integration.find({ organizationId });
  }

  async findByTypeAndOrganization(
    type: IIntegration['type'],
    organizationId: string
  ): Promise<IIntegration | null> {
    return await Integration.findOne({ type, organizationId });
  }

  async update(id: string, updates: Partial<IIntegration>): Promise<IIntegration | null> {
    return await Integration.findByIdAndUpdate(id, updates, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await Integration.findByIdAndDelete(id);
    return !!result;
  }

  async updateStatus(id: string, status: IIntegration['status'], errorMessage?: string): Promise<IIntegration | null> {
    const updates: any = { status };
    if (errorMessage !== undefined) {
      updates.errorMessage = errorMessage;
    }
    
    return await Integration.findByIdAndUpdate(id, updates, { new: true });
  }

  async updateCredentials(id: string, credentials: Partial<IIntegration['credentials']>): Promise<IIntegration | null> {
    return await Integration.findByIdAndUpdate(
      id,
      { $set: { 'credentials': { ...credentials } } },
      { new: true }
    );
  }

  async updateLastSyncTime(id: string): Promise<void> {
    await Integration.findByIdAndUpdate(id, { lastSyncAt: new Date() });
  }

  async findIntegrationsDueForSync(minutes: number = 5): Promise<IIntegration[]> {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    
    return await Integration.find({
      status: 'active',
      $or: [
        { lastSyncAt: { $lt: cutoffTime } },
        { lastSyncAt: null }
      ]
    });
  }
}