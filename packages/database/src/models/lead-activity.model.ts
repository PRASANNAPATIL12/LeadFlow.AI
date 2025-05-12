import { Schema, model, Document } from 'mongoose';

export interface ILeadActivity extends Document {
  leadId: Schema.Types.ObjectId;
  type: 'email_sent' | 'email_opened' | 'email_clicked' | 'meeting_scheduled' | 'call_completed' | 'status_changed' | 'score_changed' | 'note_added' | 'agent_action';
  data: {
    previousValue?: any;
    newValue?: any;
    emailId?: string;
    meetingId?: string;
    callId?: string;
    noteId?: string;
    agentId?: string;
    agentAction?: string;
    agentReasoning?: string;
    metadata?: Record<string, any>;
  };
  createdBy: Schema.Types.ObjectId | 'system' | 'agent';
}

const LeadActivitySchema = new Schema<ILeadActivity>(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    type: {
      type: String,
      enum: ['email_sent', 'email_opened', 'email_clicked', 'meeting_scheduled', 'call_completed', 'status_changed', 'score_changed', 'note_added', 'agent_action'],
      required: true,
    },
    data: {
      previousValue: Schema.Types.Mixed,
      newValue: Schema.Types.Mixed,
      emailId: String,
      meetingId: String,
      callId: String,
      noteId: String,
      agentId: String,
      agentAction: String,
      agentReasoning: String,
      metadata: Schema.Types.Mixed,
    },
    createdBy: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const LeadActivity = model<ILeadActivity>('LeadActivity', LeadActivitySchema);