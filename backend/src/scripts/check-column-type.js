const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(config.development.url, {
  dialect: 'postgres',
  logging: false,
});

(async () => {
  try {
    const [results] = await sequelize.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_connections' AND column_name = 'id';`);
    console.log('Column Type:', results);
  } catch (error) {
    console.error('Error checking column type:', error);
  } finally {
    await sequelize.close();
  }
})();