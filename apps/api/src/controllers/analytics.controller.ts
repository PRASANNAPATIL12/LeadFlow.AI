import { Request, Response } from 'express';
import { LeadService, CampaignService } from '@agentic-sales/database';
import { LeadActivityService } from '@agentic-sales/database';
import { Logger } from '@agentic-sales/ai-engine';

export class AnalyticsController {
  private leadService: LeadService;
  private campaignService: CampaignService;
  private activityService: LeadActivityService;
  private logger: Logger;
  
  constructor() {
    this.leadService = new LeadService();
    this.campaignService = new CampaignService();
    this.activityService = new LeadActivityService();
    this.logger = new Logger('AnalyticsController');
  }

  getDashboardMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { period = '30d' } = req.query;
      const organizationId = req.user?.organizationId;
      
      if (!organizationId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Get metrics from various services
      const [
        leadCounts,
        leadScoreDistribution,
        campaignPerformance,
        recentActivity
      ] = await Promise.all([
        this.leadService.getLeadCountsByStatus(organizationId, startDate, endDate),
        this.leadService.getLeadScoreDistribution(organizationId),
        this.campaignService.getCampaignPerformanceMetrics(organizationId, startDate, endDate),
        this.activityService.getRecentActivityForOrganization(organizationId, 10)
      ]);

      // Calculate conversion rates
      const conversionRate = leadCounts.converted / (leadCounts.total || 1) * 100;
      
      res.status(200).json({
        period,
        metrics: {
          leads: {
            total: leadCounts.total,
            new: leadCounts.new,
            inProgress: leadCounts.inProgress,
            qualified: leadCounts.qualified,
            converted: leadCounts.converted,
            lost: leadCounts.lost,
            conversionRate: parseFloat(conversionRate.toFixed(2))
          },
          scoreDistribution: leadScoreDistribution,
          campaigns: campaignPerformance,
          recentActivity: recentActivity
        }
      });
    } catch (error) {
      this.logger.error(`Error getting dashboard metrics: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  getLeadMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { period = '30d', groupBy = 'day' } = req.query;
      const organizationId = req.user?.organizationId;
      
      if (!organizationId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      
      // Implementation details would go here
      // For brevity, returning dummy data
      
      res.status(200).json({
        metrics: {
          totalLeads: 250,
          activeLeads: 150,
          averageScore: 72.5,
          timeToQualify: "3.5 days"
        },
        trends: [
          { date: '2025-04-01', newLeads: 12, qualifiedLeads: 5 },
          { date: '2025-04-02', newLeads: 15, qualifiedLeads: 7 },
          // Additional trend data would go here
        ]
      });
    } catch (error) {
      this.logger.error(`Error getting lead metrics: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
  
  // Additional controller methods would be implemented similarly
  // For brevity, I'll skip the implementations
}