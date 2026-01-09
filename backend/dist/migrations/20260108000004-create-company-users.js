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
            yield queryInterface.createTable('company_users', {
                id: {
                    type: sequelize_1.DataTypes.UUID,
                    defaultValue: sequelize_1.DataTypes.UUIDV4,
                    primaryKey: true,
                },
                company_id: {
                    type: sequelize_1.DataTypes.UUID,
                    references: {
                        model: 'companies',
                        key: 'id',
                    },
                    onDelete: 'CASCADE',
                },
                user_id: {
                    type: sequelize_1.DataTypes.UUID,
                    references: {
                        model: 'users',
                        key: 'id',
                    },
                    onDelete: 'CASCADE',
                },
                created_at: {
                    type: sequelize_1.DataTypes.DATE,
                    defaultValue: sequelize_1.DataTypes.NOW,
                },
            });
        });
    },
    down(queryInterface) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryInterface.dropTable('company_users');
        });
    },
};
