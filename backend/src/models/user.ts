import { Model, DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  class User extends Model {
    static associate(models: any) {
      User.belongsToMany(models.Company, {
        through: 'company_users',
        foreignKey: 'user_id',
      });
    }
  }

  User.init(
    {
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('super_admin', 'admin', 'user'),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,
    }
  );

  return User;
};