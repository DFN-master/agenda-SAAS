import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('companies', 'email', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'no-email@example.com',
    });

    await queryInterface.addColumn('companies', 'phone', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('companies', 'email');
    await queryInterface.removeColumn('companies', 'phone');
  },
};
