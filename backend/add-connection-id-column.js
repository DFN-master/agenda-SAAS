const { Sequelize } = require('sequelize');

// Database URL do arquivo .env
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://agenda_sys_user:dxw4RzWJ8N0P4WvfBZGd6CuJ89IZ4qJz@dpg-cth77sm1hbls73dv5200-a.oregon-postgres.render.com/agenda_sys';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function addColumn() {
  try {
    await sequelize.query('ALTER TABLE user_connections ADD COLUMN IF NOT EXISTS connection_id VARCHAR(255) UNIQUE');
    console.log('✅ Coluna connection_id adicionada com sucesso');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

addColumn();
