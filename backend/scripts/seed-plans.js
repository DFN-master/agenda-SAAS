/**
 * Script para popular o banco de dados com planos de exemplo
 * 
 * ATENÇÃO: Este é um script de teste/desenvolvimento
 * NÃO faz parte do código de produção
 */

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false
});

// Definição do modelo Plan (igual ao do código)
const Plan = sequelize.define('Plan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  max_email_connections: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  max_whatsapp_numbers: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false
  }
}, {
  tableName: 'plans',
  timestamps: true
});

async function seedPlans() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados');

    // Criar planos de exemplo
    const plans = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Plano Básico',
        max_email_connections: 1,
        max_whatsapp_numbers: 1,
        price: 49.90
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Plano Profissional',
        max_email_connections: 5,
        max_whatsapp_numbers: 3,
        price: 149.90
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Plano Empresarial',
        max_email_connections: 20,
        max_whatsapp_numbers: 10,
        price: 499.90
      }
    ];

    for (const planData of plans) {
      await Plan.upsert(planData);
    }

    console.log('✅ Planos criados/atualizados com sucesso!');

    // Listar planos
    const allPlans = await Plan.findAll({
      attributes: ['id', 'name', 'max_email_connections', 'max_whatsapp_numbers', 'price']
    });
    console.log('\nPlanos no banco de dados:');
    console.log(JSON.stringify(allPlans, null, 2));

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

seedPlans();
