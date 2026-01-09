// Script to manually create ai_learned_concepts table
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agenda', {
  dialect: 'postgres',
  logging: console.log,
});

async function createTable() {
  try {
    await sequelize.authenticate();
    console.log('Connection established successfully.');

    // Check if table exists
    const [results] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_learned_concepts'
      );
    `);

    if (results[0].exists) {
      console.log('Table ai_learned_concepts already exists!');
      process.exit(0);
    }

    // Create table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS ai_learned_concepts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        original_query TEXT NOT NULL,
        explanation TEXT NOT NULL,
        intent VARCHAR(50),
        examples TEXT[] DEFAULT '{}',
        keywords VARCHAR(255)[] DEFAULT '{}',
        created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        usage_count INTEGER DEFAULT 0,
        approved_count INTEGER DEFAULT 0,
        metadata JSON,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('Table ai_learned_concepts created successfully!');

    // Create indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_learned_concepts_company_id 
      ON ai_learned_concepts(company_id);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_learned_concepts_intent 
      ON ai_learned_concepts(intent);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_learned_concepts_keywords 
      ON ai_learned_concepts USING GIN(keywords);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_learned_concepts_usage 
      ON ai_learned_concepts(usage_count DESC, approved_count DESC);
    `);

    console.log('Indexes created successfully!');

    // Verify table creation
    const [tables] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ai_learned_concepts'
      ORDER BY ordinal_position;
    `);

    console.log('\nTable structure:');
    console.table(tables);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTable();
