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
    up(queryInterface) {
        return __awaiter(this, void 0, void 0, function* () {
            // Adicionar colunas de WhatsApp ao user_connections
            const tableDescription = yield queryInterface.describeTable('user_connections');
            if (!tableDescription['whatsapp_number']) {
                yield queryInterface.addColumn('user_connections', 'whatsapp_number', {
                    type: sequelize_1.DataTypes.STRING,
                    allowNull: true,
                });
            }
            if (!tableDescription['whatsapp_name']) {
                yield queryInterface.addColumn('user_connections', 'whatsapp_name', {
                    type: sequelize_1.DataTypes.STRING,
                    allowNull: true,
                });
            }
            if (!tableDescription['whatsapp_status']) {
                yield queryInterface.addColumn('user_connections', 'whatsapp_status', {
                    type: sequelize_1.DataTypes.TEXT,
                    allowNull: true,
                });
            }
            if (!tableDescription['whatsapp_avatar_url']) {
                yield queryInterface.addColumn('user_connections', 'whatsapp_avatar_url', {
                    type: sequelize_1.DataTypes.TEXT,
                    allowNull: true,
                });
            }
        });
    },
    down(queryInterface) {
        return __awaiter(this, void 0, void 0, function* () {
            const tableDescription = yield queryInterface.describeTable('user_connections');
            if (tableDescription['whatsapp_avatar_url']) {
                yield queryInterface.removeColumn('user_connections', 'whatsapp_avatar_url');
            }
            if (tableDescription['whatsapp_status']) {
                yield queryInterface.removeColumn('user_connections', 'whatsapp_status');
            }
            if (tableDescription['whatsapp_name']) {
                yield queryInterface.removeColumn('user_connections', 'whatsapp_name');
            }
            if (tableDescription['whatsapp_number']) {
                yield queryInterface.removeColumn('user_connections', 'whatsapp_number');
            }
        });
    },
};
