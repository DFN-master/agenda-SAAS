import { Model, DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  class AiLearnedConcept extends Model {
    static associate(models: any) {
      AiLearnedConcept.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company',
      });
      AiLearnedConcept.belongsTo(models.User, {
        foreignKey: 'created_by_user_id',
        as: 'creator',
      });
    }
  }

  AiLearnedConcept.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      original_query: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      explanation: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      intent: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      examples: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        defaultValue: [],
      },
      keywords: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
      },
      created_by_user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      usage_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      approved_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'AiLearnedConcept',
      tableName: 'ai_learned_concepts',
      underscored: true,
    }
  );

  return AiLearnedConcept;
};
