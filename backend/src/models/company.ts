import { Model, DataTypes, Sequelize } from 'sequelize';
import Plan from './plan';

export default (sequelize: Sequelize) => {
  class Company extends Model {
    static associate(models: any) {
      Company.belongsToMany(models.User, {
        through: 'company_users',
        foreignKey: 'company_id',
      });
      Company.belongsTo(Plan, {
        foreignKey: 'plan_id',
      });
    }
  }

  Company.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
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