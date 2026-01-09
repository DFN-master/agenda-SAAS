require('dotenv').config();
const { sequelize } = require('./dist/models');

sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'ai_knowledge_base'")
  .then(r => {
    const rows = r[0] || r;
    console.log('Result:', rows);
    if (rows.length === 0) {
      console.log('Table ai_knowledge_base does not exist, creating...');
      return sequelize.query(`
        CREATE TABLE ai_knowledge_base (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          tags TEXT[],
          intent VARCHAR(255),
          source_url TEXT,
          metadata JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX idx_kb_company ON ai_knowledge_base(company_id);
        CREATE INDEX idx_kb_intent ON ai_knowledge_base(intent);
        CREATE INDEX idx_kb_tags ON ai_knowledge_base USING GIN(tags);
      `);
    } else {
      console.log('Table ai_knowledge_base exists.');
    }
  })
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
