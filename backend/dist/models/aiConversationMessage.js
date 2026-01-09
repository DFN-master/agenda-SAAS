"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = (sequelize) => {
    class AiConversationMessage extends sequelize_1.Model {
        static associate(models) {
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
    AiConversationMessage.init({
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
        },
        company_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        user_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        connection_id: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: true,
        },
        client_ref: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true,
        },
        direction: {
            type: sequelize_1.DataTypes.ENUM('received', 'sent'),
            allowNull: false,
        },
        message_text: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: false,
        },
        metadata: {
            type: sequelize_1.DataTypes.JSON,
            allowNull: true,
        },
        created_at: {
            allowNull: false,
            type: sequelize_1.DataTypes.DATE,
            defaultValue: sequelize_1.DataTypes.NOW,
        },
    }, {
        sequelize,
        modelName: 'AiConversationMessage',
        tableName: 'ai_conversation_messages',
        underscored: true,
        timestamps: false,
    });
    return AiConversationMessage;
};
