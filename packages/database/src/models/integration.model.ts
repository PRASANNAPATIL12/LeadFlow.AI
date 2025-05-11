// packages/database/src/models/integration.model.ts
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
    // For Salesforce username-password flow as seen in SalesforceConnector
    username?: string;
    passwordWithToken?: string; 
    instanceUrl?: string;
  };
  settings: {
    syncFrequencyHours: number; // Renamed from syncFrequency (in minutes) for clarity with crmSyncWorker usage
    syncFields?: string[]; // Made optional
    syncDirection: 'push' | 'pull' | 'bidirectional';
    webhookUrl?: string;
  };
  lastSyncAt?: Date; // Made optional as default is null
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
      username: String,
      passwordWithToken: String,
      instanceUrl: String,
    },
    settings: {
      syncFrequencyHours: { // Renamed field
        type: Number,
        default: 1, // Default to 1 hour
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
    },
    errorMessage: String,
  },
  {
    timestamps: true, // This adds createdAt and updatedAt fields
  }
);

// Index for querying integrations by organization and type
IntegrationSchema.index({ organizationId: 1, type: 1 });

export const Integration = model<IIntegration>('Integration', IntegrationSchema);
