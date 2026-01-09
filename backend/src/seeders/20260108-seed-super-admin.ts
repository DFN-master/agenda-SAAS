import { QueryInterface } from 'sequelize';
import bcrypt from 'bcryptjs';

module.exports = {
  async up(queryInterface: QueryInterface) {
    await queryInterface.bulkInsert('users', [
      {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'superadmin@example.com',
        password_hash: await bcrypt.hash('Admin@123', 10),
        role: 'super_admin',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface: QueryInterface) {
    await queryInterface.bulkDelete('users', { email: 'superadmin@example.com' });
  },
};