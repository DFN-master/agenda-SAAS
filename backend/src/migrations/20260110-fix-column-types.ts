import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Remover a restrição de chave estrangeira (se existir)
    try {
      await queryInterface.removeConstraint('ai_conversation_messages', 'ai_conversation_messages_connection_id_fkey');
    } catch (err) {
      // Ignorar erro caso a constraint não exista
    }

    // Alterar o tipo da coluna id na tabela user_connections para STRING
    await queryInterface.changeColumn('user_connections', 'id', {
      type: DataTypes.STRING,
      allowNull: false,
    });

    // Alterar o tipo da coluna connection_id na tabela ai_conversation_messages para STRING
    await queryInterface.changeColumn('ai_conversation_messages', 'connection_id', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    // Não recriar a restrição de chave estrangeira neste passo para evitar falhas de integridade
  },

  down: async (queryInterface: QueryInterface) => {
    // Reverter o tipo da coluna connection_id para INTEGER
    await queryInterface.changeColumn('ai_conversation_messages', 'connection_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
    });

    // Reverter o tipo da coluna id para INTEGER
    await queryInterface.changeColumn('user_connections', 'id', {
      type: DataTypes.INTEGER,
      allowNull: false,
    });
  },
};