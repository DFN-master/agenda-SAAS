"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = (sequelize) => {
    class Company extends sequelize_1.Model {
        static associate(models) {
            Company.belongsToMany(models.User, {
                through: 'company_users',
                foreignKey: 'company_id',
            });
            Company.belongsTo(models.Plan, {
                foreignKey: 'plan_id',
            });
        }
    }
    Company.init({
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: false,
        },
        phone: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true,
        },
        plan_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
        },
    }, {
        sequelize,
        modelName: 'Company',
        tableName: 'companies',
        underscored: true,
    });
    return Company;
};
