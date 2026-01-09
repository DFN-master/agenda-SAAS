/**
 * Script para criar uma empresa de teste e associá-la ao super admin
 * 
 * ATENÇÃO: Este é um script de teste/desenvolvimento
 * NÃO faz parte do código de produção
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false
});

async function seedTestCompany() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados');

    // Criar empresa de teste
    await sequelize.query(`
      INSERT INTO companies (id, name, email, phone, plan_id, created_at, updated_at)
      VALUES (
        '99999999-9999-9999-9999-999999999999',
        'Empresa Teste',
        'empresa@teste.com',
        '(11) 98888-8888',
        '22222222-2222-2222-2222-222222222222',
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        plan_id = EXCLUDED.plan_id,
        updated_at = NOW()
    `);

    console.log('✅ Empresa criada/atualizada');

    // Associar superadmin com a empresa
    await sequelize.query(`
      INSERT INTO company_users (id, company_id, user_id)
      VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '99999999-9999-9999-9999-999999999999',
        '00000000-0000-0000-0000-000000000001'
      )
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Associação criada');

    // Verificar
    const [companies] = await sequelize.query(`
      SELECT c.*, p.name as plan_name
      FROM companies c
      LEFT JOIN plans p ON c.plan_id = p.id
      WHERE c.id = '99999999-9999-9999-9999-999999999999'
    `);

    console.log('\nEmpresa criada:');
    console.log(JSON.stringify(companies[0], null, 2));

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

seedTestCompany();
