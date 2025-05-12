import { LeadActivity, ILeadActivity } from '../models/lead-activity.model';

export class LeadActivityService {
  async create(activityData: Partial<ILeadActivity>): Promise<ILeadActivity> {
    const activity = new LeadActivity(activityData);
    return await activity.save();
  }

  async findByLeadId(leadId: string, limit: number = 50): Promise<ILeadActivity[]> {
    return await LeadActivity.find({ leadId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async findByType(type: ILeadActivity['type'], limit: number = 50): Promise<ILeadActivity[]> {
    return await LeadActivity.find({ type })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async countActivitiesByType(leadId: string): Promise<Record<string, number>> {
    const result = await LeadActivity.aggregate([
      { $match: { leadId } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    const countsByType: Record<string, number> = {};
    result.forEach((item) => {
      countsByType[item._id] = item.count;
    });
    
    return countsByType;
  }

  async getLatestByLeadAndType(leadId: string, type: ILeadActivity['type']): Promise<ILeadActivity | null> {
    return await LeadActivity.findOne({ leadId, type })
      .sort({ createdAt: -1 });
  }

  async getAgentActions(leadId: string, limit: number = 10): Promise<ILeadActivity[]> {
    return await LeadActivity.find({
      leadId,
      type: 'agent_action'
    })
    .sort({ createdAt: -1 })
    .limit(limit);
  }
}