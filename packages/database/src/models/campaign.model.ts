// packages/database/src/models/campaign.model.ts
import { DataTypes, Model, Optional, Sequelize, HasManyAddAssociationMixin, HasManyGetAssociationsMixin, HasManyCreateAssociationMixin } from 'sequelize';
import { CampaignStep } from './campaignStep.model'; // Assuming CampaignStep is in the same directory
import { CampaignMetric } from './campaignMetric.model'; // Assuming CampaignMetric is in the same directory

interface CampaignAttributes {
  id: string;
  name: string;
  description: string;
  type: 'email' | 'social' | 'content' | 'ads' | 'other';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'; // Added archived
  startDate?: Date; // Made optional, might be set when activated
  endDate?: Date;
  budget?: number;
  targetAudience?: string; // Could be JSON or a more structured type
  organizationId: string; // Essential for multi-tenancy
  // Sequelize automatically adds createdAt and updatedAt
}

interface CampaignCreationAttributes extends Optional<CampaignAttributes, 'id'> {}

export class Campaign extends Model<CampaignAttributes, CampaignCreationAttributes> implements CampaignAttributes {
  public id!: string;
  public name!: string;
  public description!: string;
  public type!: 'email' | 'social' | 'content' | 'ads' | 'other';
  public status!: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  public startDate?: Date;
  public endDate?: Date;
  public budget?: number;
  public targetAudience?: string;
  public organizationId!: string;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  // Associations
  public readonly steps?: CampaignStep[];
  public readonly metrics?: CampaignMetric[];

  public getSteps!: HasManyGetAssociationsMixin<CampaignStep>;
  public addStep!: HasManyAddAssociationMixin<CampaignStep, string>;
  public createStep!: HasManyCreateAssociationMixin<CampaignStep>;

  public getMetrics!: HasManyGetAssociationsMixin<CampaignMetric>;
  public addMetric!: HasManyAddAssociationMixin<CampaignMetric, string>;
  public createMetric!: HasManyCreateAssociationMixin<CampaignMetric>;
  
  static initialize(sequelize: Sequelize): void { // Renamed from initModel to initialize for clarity
    Campaign.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true // Description can be optional
      },
      type: {
        type: DataTypes.ENUM('email', 'social', 'content', 'ads', 'other'),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('draft', 'active', 'paused', 'completed', 'archived'),
        allowNull: false,
        defaultValue: 'draft'
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      budget: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      targetAudience: {
        type: DataTypes.TEXT, // Or DataTypes.JSONB if using PostgreSQL and storing complex criteria
        allowNull: true
      },
      organizationId: { // Added for multi-tenancy
        type: DataTypes.UUID, // Assuming organization IDs are UUIDs
        allowNull: false,
      }
    }, {
      sequelize,
      modelName: 'Campaign',
      tableName: 'campaigns',
      timestamps: true, // Enables createdAt and updatedAt
      // paranoid: true, // Optional: Enables soft deletes (deletedAt column)
    });
  }
  
  static associateModels(): void { // Renamed from associateModel for clarity
    Campaign.hasMany(CampaignStep, {
      foreignKey: 'campaignId',
      as: 'steps'
    });
    
    Campaign.hasMany(CampaignMetric, {
      foreignKey: 'campaignId',
      as: 'metrics'
    });
    // Define association with Organization if Organization model exists
    // Campaign.belongsTo(Organization, {
    //   foreignKey: 'organizationId',
    //   as: 'organization'
    // });
  }
}
