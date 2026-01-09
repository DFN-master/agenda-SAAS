import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
    // Drop FK if it exists because user_connections.id is integer and connection_id will become varchar
    await queryInterface.sequelize.query(
      `DO $$
       BEGIN
         IF EXISTS (
           SELECT 1 FROM information_schema.table_constraints tc
           WHERE tc.table_name = 'ai_conversation_suggestions'
             AND tc.constraint_type = 'FOREIGN KEY'
             AND tc.constraint_name = 'ai_conversation_suggestions_connection_id_fkey'
         ) THEN
           ALTER TABLE ai_conversation_suggestions
             DROP CONSTRAINT ai_conversation_suggestions_connection_id_fkey;
         END IF;
       END $$;`
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE ai_conversation_suggestions ALTER COLUMN connection_id TYPE VARCHAR(255)`
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE ai_conversation_suggestions ALTER COLUMN connection_id TYPE INTEGER`
    );

    // Optional: recreate FK if needed (kept out because connection_id is now string by design)
  },
};
