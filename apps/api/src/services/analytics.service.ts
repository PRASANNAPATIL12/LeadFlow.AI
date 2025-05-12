 0 : 0;
        clickRate: metrics.emailsSent > 0 ? (metrics.emailsClicked / metrics.emailsSent) * 100 : 0;
        replyRate: metrics.emailsSent > 0 ? (metrics.replies / metrics.emailsSent) * 100 : 0;
        meetingRate: metrics.emailsSent > 0 ? (metrics.meetings / metrics.emailsSent) * 100 : 0
      };
    } catch (error) {
      this.logger.error(`Error getting campaign analytics for campaign ${campaignId}:`, error);
      throw error;
    }
  }
  
  /**
   * Calculate campaign metrics and store in database
   */
  private async calculateCampaignMetrics(campaignId: string): Promise<void> {
    try {
      // Get campaign steps
      const campaignSteps = await CampaignStep.findAll({ where: { campaignId } });
      
      let emailsSent = 0;
      let emailsOpened = 0;
      let emailsClicked = 0;
      let replies = 0;
      let meetings = 0;
      
      // Iterate over campaign steps and calculate metrics
      for (const step of campaignSteps) {
        const stepMetrics = await CampaignMetrics.findAll({ where: { campaignStepId: step.id } });
        
        emailsSent += stepMetrics.filter(m => m.type === 'email_sent').length;
        emailsOpened += stepMetrics.filter(m => m.type === 'email_opened').length;
        emailsClicked += stepMetrics.filter(m => m.type === 'email_clicked').length;
        replies += stepMetrics.filter(m => m.type === 'reply').length;
        meetings += stepMetrics.filter(m => m.type === 'meeting_booked').length;
      }
      
      // Store campaign metrics
      await CampaignMetrics.upsert({
        campaignId,
        emailsSent,
        emailsOpened,
        emailsClicked,
        replies,
        meetings
      });
      
      this.logger.info(`Campaign metrics calculated for campaign ${campaignId}`);
    } catch (error) {
      this.logger.error(`Error calculating campaign metrics for campaign ${campaignId}:`, error);
    }
  }
}
