import { Model, DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  class Plan extends Model {
    static associate(models: any) {
      Plan.hasMany(models.Company, {
        foreignKey: 'plan_id',
      });
    }
  }

  Plan.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      max_email_connections: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      max_whatsapp_numbers: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      price: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Plan',
      tableName: 'plans',
      underscored: true,
    }
  );

  return Plan;
};