import dotenv from 'dotenv';
dotenv.config();

import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
});

(async () => {
  try {
    // Remover a foreign key se existir
    try {
      await sequelize.query(`
        ALTER TABLE ai_conversation_suggestions 
        DROP CONSTRAINT IF EXISTS ai_conversation_suggestions_connection_id_fkey
      `);
      console.log('Foreign key removida');
    } catch (e) {
      console.log('Foreign key não existe ou já foi removida');
    }
    
    // Alterar o tipo da coluna
    await sequelize.query(`
      ALTER TABLE ai_conversation_suggestions 
      ALTER COLUMN connection_id TYPE VARCHAR(255) USING connection_id::VARCHAR
    `);
    console.log('Coluna connection_id alterada para VARCHAR com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await sequelize.close();
  }
})();