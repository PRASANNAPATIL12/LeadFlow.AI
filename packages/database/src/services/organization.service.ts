import { Organization, IOrganization } from '../models/organization.model';
import { FilterQuery } from 'mongoose';
import crypto from 'crypto';

export class OrganizationService {
  async create(orgData: Partial<IOrganization>): Promise<IOrganization> {
    // Generate API key if not provided
    if (!orgData.apiKey) {
      orgData.apiKey = crypto.randomBytes(16).toString('hex');
    }
    
    const organization = new Organization(orgData);
    return await organization.save();
  }

  async findById(id: string): Promise<IOrganization | null> {
    return await Organization.findById(id);
  }

  async findByDomain(domain: string): Promise<IOrganization | null> {
    return await Organization.findOne({ domain });
  }

  async findByApiKey(apiKey: string): Promise<IOrganization | null> {
    return await Organization.findOne({ apiKey });
  }

  async update(id: string, updates: Partial<IOrganization>): Promise<IOrganization | null> {
    return await Organization.findByIdAndUpdate(id, updates, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await Organization.findByIdAndDelete(id);
    return !!result;
  }

  async updateSettings(id: string, settings: Partial<IOrganization['settings']>): Promise<IOrganization | null> {
    return await Organization.findByIdAndUpdate(
      id,
      { $set: { 'settings': { ...settings } } },
      { new: true }
    );
  }

  async findWithPagination(
    filter: FilterQuery<IOrganization>,
    page: number = 1,
    limit: number = 20
  ): Promise<{ organizations: IOrganization[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    
    const [organizations, total] = await Promise.all([
      Organization.find(filter).skip(skip).limit(limit),
      Organization.countDocuments(filter),
    ]);
    
    return {
      organizations,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async regenerateApiKey(id: string): Promise<string | null> {
    const newApiKey = crypto.randomBytes(16).toString('hex');
    const updated = await Organization.findByIdAndUpdate(
      id,
      { apiKey: newApiKey },
      { new: true }
    );
    
    return updated ? newApiKey : null;
  }
}