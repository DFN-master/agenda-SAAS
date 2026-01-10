import { QueryInterface } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    try {
      // Criar a sequência se não existir
      await queryInterface.sequelize.query(`
        CREATE SEQUENCE IF NOT EXISTS user_connections_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
      `);

      // Alterar a coluna id para usar a sequência
      await queryInterface.sequelize.query(`
        ALTER TABLE user_connections
        ALTER COLUMN id SET DEFAULT nextval('user_connections_id_seq'::regclass);
      `);

      // Garantir que a sequência está associada à tabela
      await queryInterface.sequelize.query(`
        ALTER SEQUENCE user_connections_id_seq OWNED BY user_connections.id;
      `);

      console.log('✅ Sequência user_connections_id_seq criada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao criar sequência:', error);
      throw error;
    }
  },

  down: async (queryInterface: QueryInterface) => {
    try {
      await queryInterface.sequelize.query(`
        DROP SEQUENCE IF EXISTS user_connections_id_seq;
      `);
    } catch (error) {
      console.error('❌ Erro ao remover sequência:', error);
      throw error;
    }
  },
};
