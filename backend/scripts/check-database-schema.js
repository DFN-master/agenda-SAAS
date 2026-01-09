/**
 * Script para verificar o schema do banco de dados
 * 
 * ATENÇÃO: Este é um script de teste/desenvolvimento
 * NÃO faz parte do código de produção
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false
});

async function checkSchema() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados\n');

    // Lista todas as tabelas
    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📋 Tabelas disponíveis:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));

    // Para cada tabela, mostrar as colunas
    for (const table of tables) {
      const tableName = table.table_name;
      
      const [columns] = await sequelize.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
        ORDER BY ordinal_position
      `);

      console.log(`\n📊 Tabela: ${tableName}`);
      console.log('Colunas:');
      columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? `DEFAULT ${col.column_default}` : '';
        console.log(`  - ${col.column_name}: ${col.data_type} ${nullable} ${defaultVal}`);
      });
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkSchema();
