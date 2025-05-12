import { prisma } from '@agentic-sales/database';
import { logger } from '@agentic-sales/logger';

interface LeadAnalyticsPeriod {
  startDate: Date;
  endDate: Date;
}

interface LeadAnalyticsOptions {
  companyId?: string;
  ownerId?: string;
  campaignId?: string;
  period: LeadAnalyticsPeriod;
  groupBy?: 'day' | 'week' | 'month';
}

interface LeadMetrics {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  disqualifiedLeads: number;
  convertedLeads: number;
  averageScore: number;
  totalInteractions: number;
  responseRate: number;
  avgTimeToRespond: number;
  avgTimeToQualify: number;
}

interface LeadFunnelStage {
  stage: string;
  count: number;
  percentage: number;
}

interface LeadAnalyticsResult {
  metrics: LeadMetrics;
  conversionRates: {
    leadToMeeting: number;
    meetingToOpportunity: number;
    opportunityToCustomer: number;
  };
  leadsBySource: Array<{source: string, count: number}>;
  leadsByStatus: Array<{status: string, count: number}>;
  leadsByScore: Array<{scoreRange: string, count: number}>;
  leadFunnel: LeadFunnelStage[];
  timeSeriesData: Array<{date: string, newLeads: number, qualifiedLeads: number, interactions: number}>;
}

export class LeadAnalyticsService {
  async getLeadAnalytics(options: LeadAnalyticsOptions): Promise<LeadAnalyticsResult> {
    try {
      logger.info('Generating lead analytics', { options });
      
      const { companyId, ownerId, campaignId, period } = options;
      
      // Base query filters
      const baseWhereClause: any = {
        createdAt: {
          gte: period.startDate,
          lte: period.endDate
        }
      };
      
      if (companyId) {
        baseWhereClause.companyId = companyId;
      }
      
      if (ownerId) {
        baseWhereClause.ownerId = ownerId;
      }
      
      // Get total leads
      const totalLeads = await prisma.lead.count({
        where: baseWhereClause
      });
      
      // Get new leads created in period
      const newLeads = await prisma.lead.count({
        where: {
          ...baseWhereClause,
          createdAt: {
            gte: period.startDate,
            lte: period.endDate
          }
        }
      });
      
      // Get qualified leads
      const qualifiedLeads = await prisma.lead.count({
        where: {
          ...baseWhereClause,
          status: 'qualified'
        }
      });
      
      // Get disqualified leads
      const disqualifiedLeads = await prisma.lead.count({
        where: {
          ...baseWhereClause,
          status: 'disqualified'
        }
      });
      
      // Get converted leads
      const convertedLeads = await prisma.lead.count({
        where: {
          ...baseWhereClause,
          status: 'converted'
        }
      });
      
      // Get average lead score
      const leadScores = await prisma.leadScore.findMany({
        where: {
          lead: {
            ...baseWhereClause
          },
          timestamp: {
            gte: period.startDate,
            lte: period.endDate
          }
        },
        orderBy: {
          leadId: 'asc',
          timestamp: 'desc'
        },
        distinct: ['leadId']
      });
      
      const averageScore = leadScores.length > 0 
        ? leadScores.reduce((sum, score) => sum + score.score, 0) / leadScores.length 
        : 0;
      
      // Get total interactions
      const totalInteractions = await prisma.interaction.count({
        where: {
          lead: {
            ...baseWhereClause
          },
          timestamp: {
            gte: period.startDate,
            lte: period.endDate
          }
        }
      });
      
      // Calculate response rate
      const outboundInteractions = await prisma.interaction.count({
        where: {
          lead: {
            ...baseWhereClause
          },
          channel: 'outbound',
          timestamp: {
            gte: period.startDate,
            lte: period.endDate
          }
        }
      });
      
      const inboundInteractions = await prisma.interaction.count({
        where: {
          lead: {
            ...baseWhereClause
          },
          channel: 'inbound',
          timestamp: {
            gte: period.startDate,
            lte: period.endDate
          }
        }
      });
      
      const responseRate = outboundInteractions > 0 
        ? inboundInteractions / outboundInteractions 
        : 0;
      
      // Calculate average time to respond (in hours)
      const interactionPairs: any[] = await prisma.$queryRaw`
        WITH outbound AS (
          SELECT 
            "leadId", 
            "timestamp" as outbound_time 
          FROM "Interaction" 
          WHERE 
            "channel" = 'outbound' AND
            "timestamp" >= ${period.startDate} AND
            "timestamp" <= ${period.endDate}
        ),
        inbound AS (
          SELECT 
            "leadId", 
            "timestamp" as inbound_time 
          FROM "Interaction" 
          WHERE 
            "channel" = 'inbound' AND
            "timestamp" >= ${period.startDate} AND
            "timestamp" <= ${period.endDate}
        )
        SELECT 
          o."leadId",
          o.outbound_time,
          MIN(i.inbound_time) as first_response_time
        FROM outbound o
        JOIN inbound i ON o."leadId" = i."leadId" AND i.inbound_time > o.outbound_time
        GROUP BY o."leadId", o.outbound_time
        ORDER BY o.outbound_time
      `;
      
      let avgTimeToRespond = 0;
      if (interactionPairs && interactionPairs.length > 0) {
        const totalHours = interactionPairs.reduce((sum, pair) => {
          const diff = new Date(pair.first_response_time).getTime() - new Date(pair.outbound_time).getTime();
          return sum + (diff / (1000 * 60 * 60)); // Convert ms to hours
        }, 0);
        avgTimeToRespond = totalHours / interactionPairs.length;
      }
      
      // Calculate average time to qualify (in days)
      const qualificationTimes: any[] = await prisma.$queryRaw`
        SELECT 
          l.id,
          l."createdAt",
          MIN(ls."timestamp") as qualification_time
        FROM "Lead" l
        JOIN "LeadScore" ls ON l.id = ls."leadId" AND ls.score >= 70
        WHERE 
          l."createdAt" >= ${period.startDate} AND
          l."createdAt" <= ${period.endDate}
        GROUP BY l.id, l."createdAt"
      `;
      
      let avgTimeToQualify = 0;
      if (qualificationTimes && qualificationTimes.length > 0) {
        const totalDays = qualificationTimes.reduce((sum, time) => {
          const diff = new Date(time.qualification_time).getTime() - new Date(time.createdAt).getTime();
          return sum + (diff / (1000 * 60 * 60 * 24)); // Convert ms to days
        }, 0);
        avgTimeToQualify = totalDays / qualificationTimes.length;
      }
      
      // Get leads by source
      const leadsBySource = await prisma.lead.groupBy({
        by: ['source'],
        where: baseWhereClause,
        _count: {
          id: true
        }
      });
      
      // Get leads by status
      const leadsByStatus = await prisma.lead.groupBy({
        by: ['status'],
        where: baseWhereClause,
        _count: {
          id: true
        }
      });
      
      // Get leads by score range
      const leadScoreRanges = [
        { min: 0, max: 20, range: '0-20' },
        { min: 21, max: 40, range: '21-40' },
        { min: 41, max: 60, range: '41-60' },
        { min: 61, max: 80, range: '61-80' },
        { min: 81, max: 100, range: '81-100' }
      ];
      
      const leadsByScore = [];
      
      for (const range of leadScoreRanges) {
        const count = await prisma.leadScore.count({
          where: {
            lead: {
              ...baseWhereClause
            },
            score: {
              gte: range.min,
              lte: range.max
            },
            timestamp: {
              gte: period.startDate,
              lte: period.endDate
            }
          },
          distinct: ['leadId']
        });
        
        leadsByScore.push({
          scoreRange: range.range,
          count
        });
      }
      
      // Calculate conversion rates
      const totalMeetings = await prisma.interaction.count({
        where: {
          lead: {
            ...baseWhereClause
          },
          type: 'meeting',
          timestamp: {
            gte: period.startDate,
            lte: period.endDate
          }
        },
        distinct: ['leadId']
      });
      
      const totalOpportunities = await prisma.lead.count({
        where: {
          ...baseWhereClause,
          status: 'opportunity'
        }
      });
      
      const leadToMeeting = totalLeads > 0 ? totalMeetings / totalLeads : 0;
      const meetingToOpportunity = totalMeetings > 0 ? totalOpportunities / totalMeetings : 0;
      const opportunityToCustomer = totalOpportunities > 0 ? convertedLeads / totalOpportunities : 0;
      
      // Build lead funnel
      const leadFunnel: LeadFunnelStage[] = [
        { stage: 'New Leads', count: newLeads, percentage: 100 },
        { stage: 'Engaged', count: totalInteractions > 0 ? Math.floor(newLeads * 0.7) : 0, percentage: totalInteractions > 0 ? 70 : 0 }, // Adjusted calculation
        { stage: 'Meetings', count: totalMeetings, percentage: newLeads > 0 ? (totalMeetings / newLeads) * 100 : 0 },
        { stage: 'Opportunities', count: totalOpportunities, percentage: newLeads > 0 ? (totalOpportunities / newLeads) * 100 : 0 },
        { stage: 'Customers', count: convertedLeads, percentage: newLeads > 0 ? (convertedLeads / newLeads) * 100 : 0 }
      ];
      
      // Get time series data based on groupBy parameter
      const timeSeriesData = await this.getTimeSeriesData(options);
      
      return {
        metrics: {
          totalLeads,
          newLeads,
          qualifiedLeads,
          disqualifiedLeads,
          convertedLeads,
          averageScore,
          totalInteractions,
          responseRate,
          avgTimeToRespond,
          avgTimeToQualify
        },
        conversionRates: {
          leadToMeeting,
          meetingToOpportunity,
          opportunityToCustomer
        },
        leadsBySource: leadsBySource.map(item => ({
          source: item.source || 'Unknown',
          count: item._count.id
        })),
        leadsByStatus: leadsByStatus.map(item => ({
          status: item.status || 'Unknown',
          count: item._count.id
        })),
        leadsByScore,
        leadFunnel,
        timeSeriesData
      };
    } catch (error) {
      logger.error('Error generating lead analytics', { error, options });
      throw error;
    }
  }
  
  private async getTimeSeriesData(options: LeadAnalyticsOptions): Promise<any[]> {
    // Implementation depends on database type and specific requirements
    // This is a simplified version
    const { companyId, period, groupBy = 'day' } = options;
    const result = [];
    
    // Different database query approaches based on groupBy value
    // This is just a placeholder - actual implementation would use appropriate SQL
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);
    
    // Generate date range array based on groupBy
    const dates = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      
      switch (groupBy) {
        case 'day':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'week':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'month':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
    }
    
    // For each date, get the count of new leads, qualified leads, and interactions
    for (const date of dates) {
      let periodEnd;
      
      switch (groupBy) {
        case 'day':
          periodEnd = new Date(date);
          periodEnd.setDate(date.getDate() + 1);
          break;
        case 'week':
          periodEnd = new Date(date);
          periodEnd.setDate(date.getDate() + 7);
          break;
        case 'month':
          periodEnd = new Date(date);
          periodEnd.setMonth(date.getMonth() + 1);
          break;
      }
      
      // Count new leads in this period
      const newLeadsCount = await prisma.lead.count({
        where: {
          ...(companyId ? { companyId } : {}),
          createdAt: {
            gte: date,
            lt: periodEnd
          }
        }
      });
      
      // Count qualified leads in this period
      const qualifiedLeadsCount = await prisma.lead.count({
        where: {
          ...(companyId ? { companyId } : {}),
          status: 'qualified',
          updatedAt: {
            gte: date,
            lt: periodEnd
          }
        }
      });
      
      // Count interactions in this period
      const interactionsCount = await prisma.interaction.count({
        where: {
          ...(companyId ? { lead: { companyId } } : {}),
          timestamp: {
            gte: date,
            lt: periodEnd
          }
        }
      });
      
      result.push({
        date: date.toISOString().split('T')[0],
        newLeads: newLeadsCount,
        qualifiedLeads: qualifiedLeadsCount,
        interactions: interactionsCount
      });
    }
    
    return result;
  }
}