import { QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Remover a restrição de chave estrangeira
    await queryInterface.removeConstraint('ai_conversation_messages', 'ai_conversation_messages_connection_id_fkey');

    // Remover a coluna connection_id
    await queryInterface.removeColumn('ai_conversation_messages', 'connection_id');
  },

  down: async (queryInterface: QueryInterface) => {
    // Recriar a coluna connection_id como INTEGER
    await queryInterface.addColumn('ai_conversation_messages', 'connection_id', {
      type: 'INTEGER',
      allowNull: true,
    });
  },
};