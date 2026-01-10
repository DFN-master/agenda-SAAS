import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Alterar o tipo da coluna id na tabela user_connections para STRING
    await queryInterface.changeColumn('user_connections', 'id', {
      type: DataTypes.STRING,
      allowNull: false,
    });

    // Remover a restrição de chave estrangeira (se existir)
    try {
      await queryInterface.removeConstraint('ai_conversation_messages', 'ai_conversation_messages_connection_id_fkey');
    } catch (err) {
      // Ignorar erro caso a constraint não exista
    }

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
    await queryInterface.changeColumn('ai_conversation_messages', 'connection_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
  },
};