import { QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface) {
    await queryInterface.bulkInsert('plans', [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Plano Básico',
        max_email_connections: 1,
        max_whatsapp_numbers: 1,
        price: 49.90,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Plano Profissional',
        max_email_connections: 5,
        max_whatsapp_numbers: 3,
        price: 149.90,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Plano Empresarial',
        max_email_connections: 20,
        max_whatsapp_numbers: 10,
        price: 499.90,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface: QueryInterface) {
    await queryInterface.bulkDelete('plans', {
      id: [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
      ],
    });
  },
};
