import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
    await queryInterface.createTable('ai_conversation_messages', {
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
      direction: {
        type: DataTypes.ENUM('received', 'sent'),
        allowNull: false,
      },
      message_text: {
        type: DataTypes.TEXT,
        allowNull: false,
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
    });

    await queryInterface.addIndex('ai_conversation_messages', ['company_id']);
    await queryInterface.addIndex('ai_conversation_messages', ['user_id']);
    await queryInterface.addIndex('ai_conversation_messages', ['client_ref']);
    await queryInterface.addIndex('ai_conversation_messages', ['direction']);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('ai_conversation_messages');
  },
};
