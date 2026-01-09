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
        const tableDescription = yield queryInterface.describeTable('users');
        if (!tableDescription.ai_auto_respond_enabled) {
            yield queryInterface.addColumn('users', 'ai_auto_respond_enabled', {
                type: sequelize_1.DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            });
        }
        if (!tableDescription.ai_confidence_score) {
            yield queryInterface.addColumn('users', 'ai_confidence_score', {
                type: sequelize_1.DataTypes.FLOAT,
                defaultValue: 0,
                allowNull: false,
            });
        }
        if (!tableDescription.ai_total_approvals) {
            yield queryInterface.addColumn('users', 'ai_total_approvals', {
                type: sequelize_1.DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            });
        }
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        const tableDescription = yield queryInterface.describeTable('users');
        if (tableDescription.ai_auto_respond_enabled) {
            yield queryInterface.removeColumn('users', 'ai_auto_respond_enabled');
        }
        if (tableDescription.ai_confidence_score) {
            yield queryInterface.removeColumn('users', 'ai_confidence_score');
        }
        if (tableDescription.ai_total_approvals) {
            yield queryInterface.removeColumn('users', 'ai_total_approvals');
        }
    }),
};
