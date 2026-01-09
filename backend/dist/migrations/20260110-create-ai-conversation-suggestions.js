"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface, sequelize) => __awaiter(void 0, void 0, void 0, function* () {
        yield queryInterface.createTable('ai_conversation_suggestions', {
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            company_id: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'companies',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
            },
            user_id: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
            },
            connection_id: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'user_connections',
                    key: 'id',
                },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE',
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
        });
        yield queryInterface.addIndex('ai_conversation_suggestions', ['company_id']);
        yield queryInterface.addIndex('ai_conversation_suggestions', ['user_id']);
        yield queryInterface.addIndex('ai_conversation_suggestions', ['status']);
        yield queryInterface.addIndex('ai_conversation_suggestions', ['connection_id']);
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        yield queryInterface.dropTable('ai_conversation_suggestions');
    }),
};
