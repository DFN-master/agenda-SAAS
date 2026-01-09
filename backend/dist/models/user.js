"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = (sequelize) => {
    class User extends sequelize_1.Model {
        static associate(models) {
            User.belongsToMany(models.Company, {
                through: 'company_users',
                foreignKey: 'user_id',
            });
        }
    }
    User.init({
        email: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        password_hash: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: false,
        },
        role: {
            type: sequelize_1.DataTypes.ENUM('super_admin', 'admin', 'user'),
            allowNull: false,
        },
    }, {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        underscored: true,
    });
    return User;
};
