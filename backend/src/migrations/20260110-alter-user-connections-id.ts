import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Alterar o tipo da coluna id na tabela user_connections para STRING
    await queryInterface.changeColumn('user_connections', 'id', {
      type: DataTypes.STRING,
      allowNull: false,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // Reverter o tipo da coluna id para INTEGER
    await queryInterface.changeColumn('user_connections', 'id', {
      type: DataTypes.INTEGER,
      allowNull: false,
    });
  },
};