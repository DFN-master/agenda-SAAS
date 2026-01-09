import { Model, DataTypes, Sequelize } from 'sequelize';
import Plan from './plan';

export default (sequelize: Sequelize) => {
  class Company extends Model {
    static associate(models: any) {
      Company.belongsToMany(models.User, {
        through: 'company_users',
        foreignKey: 'company_id',
      });
      Company.belongsTo(models.Plan, {
        foreignKey: 'plan_id',
      });
    }
  }

  Company.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      plan_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Company',
      tableName: 'companies',
      underscored: true,
    }
  );

  return Company;
};