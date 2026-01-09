import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
    await queryInterface.createTable('ai_conversation_suggestions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
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
      connection_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'user_connections',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      client_ref: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      incoming_message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      suggested_response: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      approved_response: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'auto_sent'),
        defaultValue: 'pending',
      },
      confidence: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.5,
      },
      feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
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

    await queryInterface.addIndex('ai_conversation_suggestions', ['company_id']);
    await queryInterface.addIndex('ai_conversation_suggestions', ['user_id']);
    await queryInterface.addIndex('ai_conversation_suggestions', ['status']);
    await queryInterface.addIndex('ai_conversation_suggestions', ['connection_id']);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('ai_conversation_suggestions');
  },
};
