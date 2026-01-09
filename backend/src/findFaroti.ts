import dotenv from 'dotenv';
dotenv.config();

import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
});

(async () => {
  try {
    const [companies] = await sequelize.query(`
      SELECT c.id, c.name, u.id as user_id, u.email 
      FROM companies c
      LEFT JOIN company_users cu ON c.id = cu.company_id
      LEFT JOIN users u ON cu.user_id = u.id
      WHERE LOWER(c.name) LIKE '%faroti%' OR LOWER(c.name) LIKE '%faro%'
    `);
    console.log('Empresas encontradas:', JSON.stringify(companies, null, 2));
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await sequelize.close();
  }
})();