import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
});

(async () => {
  try {
    const [results] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'ai_conversation_suggestions';`
    );
    console.log('Columns in ai_conversation_suggestions:', results);
  } catch (error) {
    console.error('Error fetching table structure:', error);
  } finally {
    await sequelize.close();
  }
})();