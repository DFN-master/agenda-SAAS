"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = (sequelize) => {
    class UserConnection extends sequelize_1.Model {
        static associate(models) {
            UserConnection.belongsTo(models.User, {
                foreignKey: 'user_id',
            });
            UserConnection.hasMany(models.AiConversationSuggestion, {
                foreignKey: 'connection_id',
                as: 'aiSuggestions',
            });
        }
    }
    UserConnection.init({
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
        },
        user_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        type: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: false,
        },
        name: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: false,
        },
        config: {
            type: sequelize_1.DataTypes.JSON,
            allowNull: false,
        },
        status: {
            type: sequelize_1.DataTypes.ENUM('active', 'inactive', 'error'),
            defaultValue: 'active',
        },
        // Campos específicos para WhatsApp
        whatsapp_number: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true,
        },
        whatsapp_name: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true,
        },
        whatsapp_status: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
        whatsapp_avatar_url: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        sequelize,
        modelName: 'UserConnection',
        tableName: 'user_connections',
        underscored: true,
    });
    return UserConnection;
};
