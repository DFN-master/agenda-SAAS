import { QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface) {
    // Criar empresa de teste
    await queryInterface.bulkInsert('companies', [
      {
        id: '99999999-9999-9999-9999-999999999999',
        name: 'Empresa Teste',
        email: 'empresa@teste.com',
        phone: '(11) 98888-8888',
        plan_id: '22222222-2222-2222-2222-222222222222', // Plano Profissional
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // Associar superadmin com a empresa
    await queryInterface.bulkInsert('company_users', [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        company_id: '99999999-9999-9999-9999-999999999999',
        user_id: '00000000-0000-0000-0000-000000000001', // Super Admin
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface: QueryInterface) {
    // Remover associação
    await queryInterface.bulkDelete('company_users', {
      company_id: '99999999-9999-9999-9999-999999999999',
    });

    // Remover empresa
    await queryInterface.bulkDelete('companies', {
      id: '99999999-9999-9999-9999-999999999999',
    });
  },
};
