import { Schema, model, Document } from 'mongoose';

export interface IIntegration extends Document {
  organizationId: Schema.Types.ObjectId;
  type: 'salesforce' | 'hubspot' | 'pipedrive' | 'zoho' | 'custom';
  credentials: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    accessToken?: string;
    tokenExpiresAt?: Date;
    customFields?: Record<string, any>;
  };
  settings: {
    syncFrequency: number; // in minutes
    syncFields: string[];
    syncDirection: 'push' | 'pull' | 'bidirectional';
    webhookUrl?: string;
  };
  lastSyncAt: Date;
  status: 'active' | 'error' | 'pending' | 'disabled';
  errorMessage?: string;
}

const IntegrationSchema = new Schema<IIntegration>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    type: {
      type: String,
      enum: ['salesforce', 'hubspot', 'pipedrive', 'zoho', 'custom'],
      required: true,
    },
    credentials: {
      apiKey: String,
      clientId: String,
      clientSecret: String,
      refreshToken: String,
      accessToken: String,
      tokenExpiresAt: Date,
      customFields: Schema.Types.Mixed,
    },
    settings: {
      syncFrequency: {
        type: Number,
        default: 60, // 1 hour
      },
      syncFields: [String],
      syncDirection: {
        type: String,
        enum: ['push', 'pull', 'bidirectional'],
        default: 'bidirectional',
      },
      webhookUrl: String,
    },
    lastSyncAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'error', 'pending', 'disabled'],
      default: 'pending',
    },\
    errorMessage: String,
  },
  {
    timestamps: true,
  }
);

export const Integration = model<IIntegration>('Integration', IntegrationSchema);