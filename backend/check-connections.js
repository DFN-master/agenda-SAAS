const models = require('./dist/models').default;

async function checkConnections() {
  try {
    const connections = await models.sequelize.query(
      "SELECT id, connection_id, status FROM user_connections WHERE status = 'active'",
      { type: models.sequelize.QueryTypes.SELECT }
    );
    
    console.log('Active connections:', JSON.stringify(connections, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkConnections();
