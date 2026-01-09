import { sequelize } from '../models';

(async () => {
  try {
    const [companyUsers] = await sequelize.query(
      'SELECT * FROM company_users'
    );
    
    const [companies] = await sequelize.query(
      'SELECT * FROM companies'
    );
    
    console.log('company_users:', companyUsers);
    console.log('companies:', companies);
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
