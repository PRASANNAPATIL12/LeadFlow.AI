// packages/database/src/models/lead-activity.model.ts
import { Schema, model, Document } from 'mongoose';

export interface ILeadActivity extends Document {
  leadId: Schema.Types.ObjectId;
  organizationId: Schema.Types.ObjectId; // Added for multi-tenancy and easier querying
  type: 'email_sent' | 'email_opened' | 'email_clicked' | 'meeting_scheduled' | 'call_completed' | 'status_changed' | 'score_changed' | 'note_added' | 'agent_action' | 'webhook_received' | 'system_event'; // Added more types
  channel?: string; // e.g., 'EMAIL', 'CALL', 'SALESFORCE', 'HUBSPOT', 'SYSTEM' 
  content?: string; // General description or summary of the activity
  data: { // Changed from a direct field to an object for better structure
    previousValue?: any;
    newValue?: any;
    emailId?: string;
    subject?: string; // Added for email activities
    meetingId?: string;
    callId?: string;
    noteId?: string;
    agentId?: string;
    agentAction?: string;
    agentReasoning?: string;
    webhookEvent?: string; // For webhook_received type
    metadata?: Record<string, any>;
  };
  createdBy: Schema.Types.ObjectId | 'system' | 'agent'; // Should reference User ID if by user
  timestamp: Date; // Explicit timestamp for the activity itself
}

const LeadActivitySchema = new Schema<ILeadActivity>(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    organizationId: { // Added field
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['email_sent', 'email_opened', 'email_clicked', 'meeting_scheduled', 'call_completed', 'status_changed', 'score_changed', 'note_added', 'agent_action', 'webhook_received', 'system_event'],
      required: true,
    },
    channel: {
      type: String,
    },
    content: {
      type: String,
    },
    data: {
      type: Schema.Types.Mixed, // Keep as Mixed for flexibility, but specific fields can be defined
      default: {},
      // Example of more structured data if preferred:
      // previousValue: Schema.Types.Mixed,
      // newValue: Schema.Types.Mixed,
      // emailId: String,
      // subject: String,
      // meetingId: String,
      // callId: String,
      // noteId: String,
      // agentId: String,
      // agentAction: String,
      // agentReasoning: String,
      // webhookEvent: String,
      // metadata: Schema.Types.Mixed,
    },
    createdBy: {
      type: Schema.Types.Mixed, // Can be ObjectId (ref: 'User'), or strings 'system', 'agent'
      required: true,
    },
    timestamp: { // Added explicit timestamp field
        type: Date,
        required: true,
        default: Date.now
    }
  },
  {
    timestamps: true, // This adds createdAt and updatedAt, which might be redundant with the explicit `timestamp`
                     // Consider if both are needed. `timestamp` is likely the actual event time.
  }
);

LeadActivitySchema.index({ leadId: 1, timestamp: -1 }); // Index for querying activities for a lead chronologically

export const LeadActivity = model<ILeadActivity>('LeadActivity', LeadActivitySchema);
