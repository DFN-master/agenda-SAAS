const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(config.development.url, {
  dialect: 'postgres',
  logging: false,
});

(async () => {
  try {
    console.log('Removing foreign key constraint...');
    await sequelize.query("ALTER TABLE ai_conversation_messages DROP CONSTRAINT IF EXISTS ai_conversation_messages_connection_id_fkey;");
    console.log('Foreign key constraint removed successfully.');
  } catch (error) {
    console.error('Error removing foreign key constraint:', error);
  } finally {
    await sequelize.close();
  }
})();