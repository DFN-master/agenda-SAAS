import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
    const tableDescription = await queryInterface.describeTable('users');
    
    if (!tableDescription.ai_auto_respond_enabled) {
      await queryInterface.addColumn('users', 'ai_auto_respond_enabled', {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      });
    }

    if (!tableDescription.ai_confidence_score) {
      await queryInterface.addColumn('users', 'ai_confidence_score', {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        allowNull: false,
      });
    }

    if (!tableDescription.ai_total_approvals) {
      await queryInterface.addColumn('users', 'ai_total_approvals', {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable('users');
    
    if (tableDescription.ai_auto_respond_enabled) {
      await queryInterface.removeColumn('users', 'ai_auto_respond_enabled');
    }

    if (tableDescription.ai_confidence_score) {
      await queryInterface.removeColumn('users', 'ai_confidence_score');
    }

    if (tableDescription.ai_total_approvals) {
      await queryInterface.removeColumn('users', 'ai_total_approvals');
    }
  },
};
