import { Model, DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  class UserConnection extends Model {
    static associate(models: any) {
      UserConnection.belongsTo(models.User, {
        foreignKey: 'user_id',
      });
      UserConnection.hasMany(models.AiConversationSuggestion, {
        foreignKey: 'connection_id',
        as: 'aiSuggestions',
      });
    }
  }

  UserConnection.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      config: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'error'),
        defaultValue: 'active',
      },
      // Campos específicos para WhatsApp
      whatsapp_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      whatsapp_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      whatsapp_status: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      whatsapp_avatar_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'UserConnection',
      tableName: 'user_connections',
      underscored: true,
    }
  );

  return UserConnection;
};
