import { Model, DataTypes, Sequelize } from 'sequelize';

/**
 * AiWordMeaning: Stores semantic vocabulary entries (word meanings) per company.
 * Used by the AI engine to understand words and compose responses.
 */
export default (sequelize: Sequelize) => {
  class AiWordMeaning extends Model {
    static associate(models: any) {
      AiWordMeaning.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company',
      });
    }
  }

  AiWordMeaning.init(
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
      word: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      definition: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      source_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
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
      modelName: 'AiWordMeaning',
      tableName: 'ai_word_meanings',
      underscored: true,
    }
  );

  return AiWordMeaning;
};
