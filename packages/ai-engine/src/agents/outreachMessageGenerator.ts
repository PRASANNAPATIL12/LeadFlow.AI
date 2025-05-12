      Format output as valid JSON.
    `;
  }

  private parseMessageResponse(response: string): GeneratedMessage {
    try {
      // Extract JSON from LLM response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON from LLM response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Set follow-up date if provided
      let followUpDate: Date | undefined = undefined;
      if (parsed.suggestedFollowUpDate) {
        followUpDate = new Date(parsed.suggestedFollowUpDate);
        if (isNaN(followUpDate.getTime())) {
          // If date parsing fails, set a default follow-up of 3 business days
          followUpDate = new Date();
          followUpDate.setDate(followUpDate.getDate() + 3);
        }
      }
      
      return {
        subject: parsed.subject || 'No subject generated',
        body: parsed.body || 'No message body generated',
        callToAction: parsed.callToAction,
        personalizationScore: parsed.personalizationScore || 0,
        suggestedFollowUpDate: followUpDate,
      };
    } catch (error) {
      this.logger.error(`Failed to parse message response: ${error}`);
      // Return default results if parsing fails
      return {
        subject: 'Follow-up regarding your business needs',
        body: 'There was an error generating your personalized message. Please review the lead data and customize this template.',
        personalizationScore: 0,
      };
    }
  }

  async updateOrganizationInfo(info: Record<string, any>): Promise<void> {
    this.organizationInfo = {
      ...this.organizationInfo,
      ...info,
    };
    this.logger.info('Updated organization information');
  }
}