// packages/database/src/models/campaignMetric.model.ts
import { DataTypes, Model, Optional, Sequelize, BelongsToGetAssociationMixin } from 'sequelize';
import { Campaign } from './campaign.model';

interface CampaignMetricAttributes {
  id: string;
  campaignId: string;
  date: Date; // Date for which the metric is recorded
  type: 'impression' | 'click' | 'conversion' | 'open' | 'reply' | 'meeting_booked' | 'lead_added' | 'custom'; // Added lead_added
  value: number;
  metadata?: any; // JSON object for additional metric-specific data (e.g., email_id for open/click)
  // Sequelize automatically adds createdAt and updatedAt
}

interface CampaignMetricCreationAttributes extends Optional<CampaignMetricAttributes, 'id'> {}

export class CampaignMetric extends Model<CampaignMetricAttributes, CampaignMetricCreationAttributes> implements CampaignMetricAttributes {
  public id!: string;
  public campaignId!: string;
  public date!: Date;
  public type!: 'impression' | 'click' | 'conversion' | 'open' | 'reply' | 'meeting_booked' | 'lead_added' | 'custom';
  public value!: number;
  public metadata?: any;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  // Associations
  public readonly campaign?: Campaign;
  public getCampaign!: BelongsToGetAssociationMixin<Campaign>;

  static initialize(sequelize: Sequelize): void { // Renamed from initModel
    CampaignMetric.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      campaignId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: Campaign, // Reference Campaign model
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      date: {
        type: DataTypes.DATEONLY, // Records metric for a specific day
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM('impression', 'click', 'conversion', 'open', 'reply', 'meeting_booked', 'lead_added', 'custom'),
        allowNull: false
      },
      value: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      metadata: {
        type: DataTypes.JSON, // Or JSONB for PostgreSQL
        allowNull: true
      }
    }, {
      sequelize,
      modelName: 'CampaignMetric',
      tableName: 'campaign_metrics',
      timestamps: true, // Enables createdAt and updatedAt
      indexes: [
        { fields: ['campaignId', 'date', 'type'] } // Useful index for querying metrics
      ]
    });
  }
  
  static associateModels(): void { // Renamed from associateModel
    CampaignMetric.belongsTo(Campaign, {
      foreignKey: 'campaignId',
      as: 'campaign'
    });
  }
}
