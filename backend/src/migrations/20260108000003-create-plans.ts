import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface) {
    await queryInterface.createTable('plans', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
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
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addColumn('companies', 'plan_id', {
      type: DataTypes.UUID,
      references: {
        model: 'plans',
        key: 'id',
      },
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface: QueryInterface) {
    await queryInterface.removeColumn('companies', 'plan_id');
    await queryInterface.dropTable('plans');
  },
};