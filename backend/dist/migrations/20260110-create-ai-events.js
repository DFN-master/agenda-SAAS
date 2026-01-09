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
        yield queryInterface.createTable('ai_events', {
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
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
        });
        yield queryInterface.addIndex('ai_events', ['user_id']);
        yield queryInterface.addIndex('ai_events', ['client_ref']);
        yield queryInterface.addIndex('ai_events', ['intent']);
        yield queryInterface.addIndex('ai_events', ['source']);
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        yield queryInterface.dropTable('ai_events');
    }),
};
