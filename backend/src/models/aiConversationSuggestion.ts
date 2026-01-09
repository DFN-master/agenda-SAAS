import { Model, DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  class AiConversationSuggestion extends Model {
    static associate(models: any) {
      AiConversationSuggestion.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
      AiConversationSuggestion.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company',
      });
      AiConversationSuggestion.belongsTo(models.UserConnection, {
        foreignKey: 'connection_id',
        as: 'userConnection',
      });
    }
  }

  AiConversationSuggestion.init(
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
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      connection_id: {
        // Matches user_connections.id (INTEGER) to avoid join type mismatch
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      client_ref: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      incoming_message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      suggested_response: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      approved_response: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'auto_sent'),
        defaultValue: 'pending',
      },
      confidence: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.5,
      },
      feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
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
      modelName: 'AiConversationSuggestion',
      tableName: 'ai_conversation_suggestions',
      underscored: true,
    }
  );

  return AiConversationSuggestion;
};
