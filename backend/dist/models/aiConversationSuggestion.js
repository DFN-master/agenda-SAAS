"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = (sequelize) => {
    class AiConversationSuggestion extends sequelize_1.Model {
        static associate(models) {
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
    AiConversationSuggestion.init({
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
            // Matches user_connections.id (INTEGER) to avoid join type mismatch
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: true,
        },
        client_ref: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true,
        },
        incoming_message: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: false,
        },
        suggested_response: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
        approved_response: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
        status: {
            type: sequelize_1.DataTypes.ENUM('pending', 'approved', 'rejected', 'auto_sent'),
            defaultValue: 'pending',
        },
        confidence: {
            type: sequelize_1.DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0.5,
        },
        feedback: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
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
        updated_at: {
            allowNull: false,
            type: sequelize_1.DataTypes.DATE,
            defaultValue: sequelize_1.DataTypes.NOW,
        },
    }, {
        sequelize,
        modelName: 'AiConversationSuggestion',
        tableName: 'ai_conversation_suggestions',
        underscored: true,
    });
    return AiConversationSuggestion;
};
