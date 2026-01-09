"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = (sequelize) => {
    class AiEvent extends sequelize_1.Model {
        static associate(models) {
            AiEvent.belongsTo(models.User, {
                foreignKey: 'user_id',
                as: 'user',
            });
        }
    }
    AiEvent.init({
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
        },
        user_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        source: {
            type: sequelize_1.DataTypes.ENUM('email', 'whatsapp', 'agenda', 'manual'),
            allowNull: false,
            defaultValue: 'manual',
        },
        client_ref: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true,
        },
        subject: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true,
        },
        summary: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
        intent: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true,
        },
        occurrence_count: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        metadata: {
            type: sequelize_1.DataTypes.JSON,
            allowNull: true,
        },
        occurred_at: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize_1.DataTypes.NOW,
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
        modelName: 'AiEvent',
        tableName: 'ai_events',
        underscored: true,
    });
    return AiEvent;
};
