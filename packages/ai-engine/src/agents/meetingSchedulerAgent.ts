import { LLMConnector } from '../utils/llmConnector';
import { AgentMemory } from '../utils/agentMemory';
import { Logger } from '../utils/logger';

interface ScheduleRequest {
  leadId: string;
  leadName: string;
  leadEmail: string;
  leadCompany: string;
  availableTimes: string[];
  purpose: string;
  duration: '15min' | '30min' | '45min' | '60min';
  timezone: string;
  previousCommunication?: string[];
}

interface ScheduleOptions {
  suggestAlternatives: boolean;
  includeAgenda: boolean;
  includePreMeetingQuestions: boolean;
  personalizeMessage: boolean;
}

interface ScheduleResult {
  emailSubject: string;
  emailBody: string;
  suggestedTimes: string[];
  agenda?: string[];
  preMeetingQuestions?: string[];
}

export class MeetingSchedulerAgent {
  private llm: LLMConnector;
  private memory: AgentMemory;
  private logger: Logger;

  constructor(organizationId: string) {
    this.llm = new LLMConnector();
    this.memory = new AgentMemory(`meeting-scheduler-${organizationId}`);
    this.logger = new Logger('MeetingSchedulerAgent');
  }

  async scheduleMeeting(request: ScheduleRequest, options: ScheduleOptions): Promise<ScheduleResult> {
    try {
      // Get previous meeting history with this lead
      const previousMeetings = await this.memory.get(request.leadId) || [];
      
      const prompt = this.buildSchedulePrompt(request, options, previousMeetings);
      const response = await this.llm.complete(prompt, 'meeting-scheduler');
      
      // Parse the LLM response
      const scheduleResult = this.parseScheduleResponse(response);
      
      // Store the schedule request in memory
      await this.memory.store(request.leadId, [
        ...(Array.isArray(previousMeetings) ? previousMeetings : []),
        {
          date: new Date(),
          purpose: request.purpose,
          duration: request.duration,
          suggestedTimes: scheduleResult.suggestedTimes,
        }
      ]);
      
      this.logger.info(`Generated meeting schedule email for ${request.leadName}`);
      
      return scheduleResult;
    } catch (error) {
      this.logger.error(`Error generating meeting schedule for ${request.leadName}: ${error}`);
      throw new Error(`Failed to generate meeting schedule: ${error}`);
    }
  }

  private buildSchedulePrompt(request: ScheduleRequest, options: ScheduleOptions, previousMeetings: any[]): string {
    return `
      Task: Generate a professional email to schedule a business meeting.
      
      Meeting Request Details:
      - Lead Name: ${request.leadName}
      - Company: ${request.leadCompany}
      - Purpose: ${request.purpose}
      - Duration: ${request.duration}
      - Available Times: ${request.availableTimes.join(', ')}
      - Timezone: ${request.timezone}
      
      Email Options:
      - Suggest Alternatives: ${options.suggestAlternatives ? 'Yes' : 'No'}
      - Include Agenda: ${options.includeAgenda ? 'Yes' : 'No'}
      - Include Pre-Meeting Questions: ${options.includePreMeetingQuestions ? 'Yes' : 'No'}
      - Personalize Message: ${options.personalizeMessage ? 'Yes' : 'No'}
      
      ${previousMeetings.length > 0 ? `Previous Meetings: ${JSON.stringify(previousMeetings)}` : 'No previous meetings'}
      ${request.previousCommunication ? `Previous Communication: ${JSON.stringify(request.previousCommunication)}` : ''}
      
      Generate a professional email with:
      1. Subject line
      2. Email body with proper greeting and closing
      3. Clear meeting purpose explanation
      4. Suggested meeting times (choose the 2-3 most appropriate from available times)
      5. ${options.includeAgenda ? 'Brief meeting agenda' : ''}
      6. ${options.includePreMeetingQuestions ? '2-3 pre-meeting questions to help prepare for the discussion' : ''}
      
      Format output as valid JSON.
    `;
  }

  private parseScheduleResponse(response: string): ScheduleResult {
    try {
      // Extract JSON from LLM response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON from LLM response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        emailSubject: parsed.subject || 'Meeting Request',
        emailBody: parsed.body || 'No email body generated',
        suggestedTimes: Array.isArray(parsed.suggestedTimes) ? parsed.suggestedTimes : [],
        agenda: parsed.agenda,
        preMeetingQuestions: parsed.preMeetingQuestions,
      };
    } catch (error) {
      this.logger.error(`Failed to parse schedule response: ${error}`);
      // Return default results if parsing fails
      return {
        emailSubject: 'Request to Schedule a Meeting',
        emailBody: 'There was an error generating your personalized scheduling email. Please customize this template.',
        suggestedTimes: [],
      };
    }
  }
}