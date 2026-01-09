import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
    await queryInterface.createTable('ai_events', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      source: {
        type: DataTypes.ENUM('email', 'whatsapp', 'agenda', 'manual'),
        allowNull: false,
        defaultValue: 'manual',
      },
      client_ref: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      subject: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      summary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      intent: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      occurrence_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      occurred_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      created_at: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('ai_events', ['user_id']);
    await queryInterface.addIndex('ai_events', ['client_ref']);
    await queryInterface.addIndex('ai_events', ['intent']);
    await queryInterface.addIndex('ai_events', ['source']);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('ai_events');
  },
};
