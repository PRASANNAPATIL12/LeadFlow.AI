// packages/database/src/models/campaignStep.model.ts
import { DataTypes, Model, Optional, Sequelize, BelongsToGetAssociationMixin } from 'sequelize';
import { Campaign } from './campaign.model';

interface CampaignStepAttributes {
  id: string;
  campaignId: string;
  name: string;
  description?: string; // Made optional
  type: 'email' | 'call' | 'social' | 'content' | 'form' | 'custom' | 'wait' | 'condition'; // Added wait, condition
  status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped'; // Added skipped
  order: number; // Sequence order of the step in the campaign
  delayHours?: number; // Delay in hours from the completion of the previous step (if applicable)
  conditions?: any; // JSON object with conditional logic for 'condition' type or general step execution
  content?: any;    // JSON object with step-specific content (e.g., email template ID, call script ID, content URL)
  // Sequelize automatically adds createdAt and updatedAt
}

interface CampaignStepCreationAttributes extends Optional<CampaignStepAttributes, 'id'> {}

export class CampaignStep extends Model<CampaignStepAttributes, CampaignStepCreationAttributes> implements CampaignStepAttributes {
  public id!: string;
  public campaignId!: string;
  public name!: string;
  public description?: string;
  public type!: 'email' | 'call' | 'social' | 'content' | 'form' | 'custom' | 'wait' | 'condition';
  public status!: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
  public order!: number;
  public delayHours?: number;
  public conditions?: any;
  public content?: any;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  // Associations
  public readonly campaign?: Campaign;
  public getCampaign!: BelongsToGetAssociationMixin<Campaign>;
  
  static initialize(sequelize: Sequelize): void { // Renamed from initModel
    CampaignStep.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      campaignId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: Campaign, // Reference the Campaign model directly
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      type: {
        type: DataTypes.ENUM('email', 'call', 'social', 'content', 'form', 'custom', 'wait', 'condition'),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('pending', 'active', 'completed', 'failed', 'skipped'),
        allowNull: false,
        defaultValue: 'pending'
      },
      order: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      delayHours: { // Changed from delay to delayHours for clarity
        type: DataTypes.INTEGER,
        allowNull: true, // Delay is optional
        defaultValue: 0
      },
      conditions: {
        type: DataTypes.JSON, // Or JSONB for PostgreSQL
        allowNull: true
      },
      content: {
        type: DataTypes.JSON, // Or JSONB for PostgreSQL
        allowNull: true
      }
    }, {
      sequelize,
      modelName: 'CampaignStep',
      tableName: 'campaign_steps',
      timestamps: true,
      // paranoid: true, // Optional: for soft deletes
      indexes: [
        { fields: ['campaignId', 'order'], unique: true } // Ensure order is unique within a campaign
      ]
    });
  }
  
  static associateModels(): void { // Renamed from associateModel
    CampaignStep.belongsTo(Campaign, {
      foreignKey: 'campaignId',
      as: 'campaign'
    });
  }
}
