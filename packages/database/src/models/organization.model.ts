import { Schema, model, Document } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  domain: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  apiKey: string;
  settings: {
    leadThreshold: number;
    autoFollowUp: boolean;
    maxDailyEmails: number;
    aiAgentSettings: Record<string, any>;
  };
  isActive: boolean;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    plan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free',
    },
    apiKey: {
      type: String,
      required: true,
      unique: true,
    },
    settings: {
      leadThreshold: {
        type: Number,
        default: 70,
      },
      autoFollowUp: {
        type: Boolean,
        default: false,
      },
      maxDailyEmails: {
        type: Number,
        default: 100,
      },
      aiAgentSettings: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },\
  },
  {
    timestamps: true,
  }
);

export const Organization = model<IOrganization>('Organization', OrganizationSchema);