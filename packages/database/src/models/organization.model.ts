// packages/database/src/models/organization.model.ts
import { Schema, model, Document } from 'mongoose';
import crypto from 'crypto'; // For generating API key by default

export interface IOrganization extends Document {
  name: string;
  domain?: string; // Made domain optional as per original code
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  apiKey: string;
  settings: {
    leadThreshold: number;
    autoFollowUp: boolean;
    maxDailyEmails: number;
    aiAgentSettings: Record<string, any>;
    // Added from later code snippets
    defaultFromEmail?: string;
    defaultReplyToEmail?: string;
    industry?: string; // For organization context
    productDescription?: string; // For organization context
  };
  isActive: boolean;
  // Added from later code snippets, this would be a separate linked model in relational DBs
  // For Mongoose, it could be an array of subdocuments or references
  products?: Array<{ name: string; description?: string; features?: string[] }>; 
  targetCustomerProfile?: { description?: string; industries?: string[]; companySizes?: string[]; painPoints?: string[] };
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
      // required: true, // Making it optional for now as per your interface comment
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true, // Allows multiple documents to have null for domain but unique if not null
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
      default: () => crypto.randomBytes(16).toString('hex') // Generate API key by default
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
      defaultFromEmail: String,
      defaultReplyToEmail: String,
      industry: String,
      productDescription: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    products: [{
        name: String,
        description: String,
        features: [String]
    }],
    targetCustomerProfile: {
        description: String,
        industries: [String],
        companySizes: [String],
        painPoints: [String]
    }
  },
  {
    timestamps: true, // This adds createdAt and updatedAt fields
  }
);

export const Organization = model<IOrganization>('Organization', OrganizationSchema);
