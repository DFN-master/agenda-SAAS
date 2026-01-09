import { Model, DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  class AiConversationMessage extends Model {
    static associate(models: any) {
      AiConversationMessage.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
      AiConversationMessage.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company',
      });
      AiConversationMessage.belongsTo(models.UserConnection, {
        foreignKey: 'connection_id',
        as: 'connection',
      });
    }
  }

  AiConversationMessage.init(
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
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      client_ref: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      direction: {
        type: DataTypes.ENUM('received', 'sent'),
        allowNull: false,
      },
      message_text: {
        type: DataTypes.TEXT,
        allowNull: false,
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
    },
    {
      sequelize,
      modelName: 'AiConversationMessage',
      tableName: 'ai_conversation_messages',
      underscored: true,
      timestamps: false,
    }
  );

  return AiConversationMessage;
};
