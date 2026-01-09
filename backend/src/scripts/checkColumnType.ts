import { sequelize } from '../models';

(async () => {
  try {
    const [results] = await sequelize.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'ai_conversation_suggestions';`
    );
    console.log(results);
  } catch (error) {
    console.error('Error checking column type:', error);
  } finally {
    await sequelize.close();
  }
})();