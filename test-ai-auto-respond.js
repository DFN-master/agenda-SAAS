const { Sequelize } = require('sequelize');
require('dotenv').config();

async function checkAutoRespond() {
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco\n');

    // Buscar todos os usuários e verificar auto_respond
    const [users] = await sequelize.query(`
      SELECT 
        id, 
        name, 
        email,
        ai_auto_respond_enabled,
        ai_confidence_score,
        ai_total_approvals
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('📊 STATUS AUTO-RESPOND DOS USUÁRIOS:\n');
    console.log('═'.repeat(80));
    
    if (users.length === 0) {
      console.log('❌ Nenhum usuário encontrado!');
    } else {
      users.forEach(user => {
        const autoEnabled = user.ai_auto_respond_enabled ? '✅ ATIVADO' : '❌ DESATIVADO';
        console.log(`\n👤 ${user.name} (${user.email})`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Auto-Respond: ${autoEnabled}`);
        console.log(`   Confiança: ${(user.ai_confidence_score || 0).toFixed(2)}`);
        console.log(`   Total Approvals: ${user.ai_total_approvals || 0}`);
      });
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n💡 COMO ATIVAR AUTO-RESPOND:');
    console.log('\n1. Via API (com token JWT):');
    console.log('   POST http://localhost:3000/api/ai/auto-respond/enable');
    console.log('   Body: { "company_id": "uuid-da-empresa" }');
    console.log('\n2. Via SQL direto:');
    console.log('   UPDATE users SET ai_auto_respond_enabled = true WHERE id = \'seu-user-id\';');
    console.log('\n3. Verifique também se há conexão WhatsApp ativa:');
    const [connections] = await sequelize.query(`
      SELECT id, company_id, connection_id, status, metadata
      FROM user_connections
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (connections.length === 0) {
      console.log('   ⚠️  NENHUMA CONEXÃO WHATSAPP ATIVA ENCONTRADA!');
      console.log('   → Escaneie o QR Code primeiro para conectar o WhatsApp');
    } else {
      console.log('   ✅ Conexões WhatsApp ativas:');
      connections.forEach(conn => {
        console.log(`      - Connection ${conn.connection_id} (Company: ${conn.company_id})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkAutoRespond();
