import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Remover a restrição de chave estrangeira
    await queryInterface.removeConstraint('ai_conversation_messages', 'ai_conversation_messages_connection_id_fkey');

    // Alterar o tipo da coluna connection_id para STRING
    await queryInterface.changeColumn('ai_conversation_messages', 'connection_id', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    // Recriar a restrição de chave estrangeira com o tipo atualizado
    await queryInterface.addConstraint('ai_conversation_messages', {
      fields: ['connection_id'],
      type: 'foreign key',
      name: 'ai_conversation_messages_connection_id_fkey',
      references: {
        table: 'user_connections',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // Reverter o tipo da coluna connection_id para INTEGER
    await queryInterface.changeColumn('ai_conversation_messages', 'connection_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
  },
};