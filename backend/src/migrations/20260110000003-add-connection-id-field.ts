import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('user_connections', 'connection_id', {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('user_connections', 'connection_id');
  },
};
