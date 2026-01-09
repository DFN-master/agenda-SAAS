const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(config.development.url, {
  dialect: 'postgres',
  logging: false,
});

(async () => {
  try {
    console.log('Cleaning incompatible data from connection_id...');
    await sequelize.query("UPDATE ai_conversation_messages SET connection_id = NULL WHERE connection_id::TEXT !~ '^[0-9]+$';");
    console.log('Incompatible data cleaned successfully.');
  } catch (error) {
    console.error('Error cleaning data:', error);
  } finally {
    await sequelize.close();
  }
})();