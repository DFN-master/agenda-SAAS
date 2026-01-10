const { Sequelize } = require('sequelize');

const DATABASE_URL = 'postgresql://agenda_sys_user:dxw4RzWJ8N0P4WvfBZGd6CuJ89IZ4qJz@dpg-cth77sm1hbls73dv5200-a.oregon-postgres.render.com/agenda_sys';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function checkColumns() {
  try {
    const [results] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_connections'
      ORDER BY ordinal_position
    `);
    console.log('\n📋 Colunas na tabela user_connections:');
    console.table(results);
    
    const [data] = await sequelize.query('SELECT * FROM user_connections LIMIT 5');
    console.log('\n📊 Primeiros registros:');
    console.table(data);
    
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    await sequelize.close();
    process.exit(1);
  }
}

checkColumns();
