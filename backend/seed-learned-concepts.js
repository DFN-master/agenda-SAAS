/**
 * Seed file for AI learned concepts
 * Populates initial teaching examples so the AI starts with some pre-trained patterns
 */

const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agenda',
  {
    dialect: 'postgres',
    logging: false,
  }
);

async function seedLearnedConcepts() {
  try {
    await sequelize.authenticate();
    console.log('Connection established successfully.');

    // Company ID for test data (from seed-test-company.js)
    const COMPANY_ID = '99999999-9999-9999-9999-999999999999';
    const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';

    // Initial concepts to teach the AI
    const concepts = [
      {
        id: uuidv4(),
        company_id: COMPANY_ID,
        original_query: 'Quais são os planos disponíveis?',
        explanation:
          'O cliente quer saber quais planos de hospedagem temos disponíveis. Devemos listar os planos com suas características principais e preços.',
        intent: 'preço',
        examples: [
          'Qual é o melhor plano para meu site?',
          'Vocês têm planos de hospedagem compartilhada?',
          'Qual a diferença entre VPS e dedicado?',
        ],
        keywords: ['planos', 'hospedagem', 'preço', 'contratação'],
        created_by_user_id: '00000000-0000-0000-0000-000000000001',
        usage_count: 0,
        approved_count: 5,
        metadata: { source: 'seed', category: 'produto' },
      },
      {
        id: uuidv4(),
        company_id: COMPANY_ID,
        original_query: 'Como agendar um atendimento ou suporte?',
        explanation:
          'Cliente quer saber como marcar uma reunião ou atendimento com nosso time. Devemos orientar sobre os horários de funcionamento e canais disponíveis.',
        intent: 'agendamento',
        examples: [
          'Preciso falar com o time técnico',
          'Quando posso agendar uma consulta?',
          'Qual seu horário de atendimento?',
        ],
        keywords: ['agendar', 'atendimento', 'reunião', 'consulta', 'horário'],
        created_by_user_id: ADMIN_USER_ID,
        usage_count: 0,
        approved_count: 4,
        metadata: { source: 'seed', category: 'suporte' },
      },
      {
        id: uuidv4(),
        company_id: COMPANY_ID,
        original_query: 'Meu site está fora do ar, o que faço?',
        explanation:
          'Site do cliente está com problemas de disponibilidade. Devemos fazer diagnóstico rápido: verificar status do servidor, DNS, SSL, e fornecer próximos passos.',
        intent: 'suporte',
        examples: [
          'Recebi erro 500 no meu site',
          'As pessoas não conseguem acessar meu domínio',
          'Meu email não está funcionando',
          'Site muito lento',
        ],
        keywords: ['error', 'fora', 'problema', 'não funciona', 'lento', 'indisponível'],
        created_by_user_id: ADMIN_USER_ID,
        usage_count: 0,
        approved_count: 6,
        metadata: { source: 'seed', category: 'troubleshooting' },
      },
      {
        id: uuidv4(),
        company_id: COMPANY_ID,
        original_query: 'Quero cancelar minha conta/serviço',
        explanation:
          'Cliente deseja cancelar. Devemos entender melhor o motivo, oferecer alternativas se possível, explicar o processo de cancelamento e data efetiva.',
        intent: 'cancelamento',
        examples: [
          'Não preciso mais do serviço',
          'Vou mudar para outro provedor',
          'Como faço para cancelar?',
        ],
        keywords: ['cancelar', 'encerrar', 'parar', 'desativar'],
        created_by_user_id: ADMIN_USER_ID,
        usage_count: 0,
        approved_count: 3,
        metadata: { source: 'seed', category: 'conta' },
      },
      {
        id: uuidv4(),
        company_id: COMPANY_ID,
        original_query: 'Onde vocês ficam? Qual o endereço?',
        explanation:
          'Cliente quer saber a localização física da empresa. Devemos fornecer endereço, mapa, telefone de contato e horário de funcionamento do escritório.',
        intent: 'localização',
        examples: [
          'Qual a sede da empresa?',
          'Vocês têm escritório em São Paulo?',
          'Posso visitar?',
        ],
        keywords: ['endereço', 'localização', 'sede', 'escritório', 'onde'],
        created_by_user_id: ADMIN_USER_ID,
        usage_count: 0,
        approved_count: 2,
        metadata: { source: 'seed', category: 'empresa' },
      },
      {
        id: uuidv4(),
        company_id: COMPANY_ID,
        original_query: 'Qual a diferença entre VPS e servidor dedicado?',
        explanation:
          'Cliente quer entender as diferenças técnicas entre soluções. VPS é mais econômico e compartilhado, dedicado é exclusivo e mais poderoso. Devemos explicar o trade-off entre preço e performance.',
        intent: 'preço',
        examples: [
          'VPS é melhor que hospedagem compartilhada?',
          'Servidor dedicado vale a pena?',
          'Qual servidor recomenda para meu site?',
        ],
        keywords: ['vps', 'dedicado', 'compartilhado', 'servidor', 'diferença'],
        created_by_user_id: ADMIN_USER_ID,
        usage_count: 0,
        approved_count: 3,
        metadata: { source: 'seed', category: 'produto' },
      },
      {
        id: uuidv4(),
        company_id: COMPANY_ID,
        original_query: 'Como fazer backup dos meus dados?',
        explanation:
          'Cliente quer proteger seus dados. Devemos explicar se fazemos backups automáticos, com que frequência, como restaurar, e opções de backup externo.',
        intent: 'suporte',
        examples: [
          'Você faz backup do meu site?',
          'Como restaurar um backup?',
          'Posso baixar meus arquivos?',
        ],
        keywords: ['backup', 'restaurar', 'arquivo', 'dados', 'segurança'],
        created_by_user_id: ADMIN_USER_ID,
        usage_count: 0,
        approved_count: 4,
        metadata: { source: 'seed', category: 'segurança' },
      },
      {
        id: uuidv4(),
        company_id: COMPANY_ID,
        original_query: 'Meu email corporativo não recebe mensagens',
        explanation:
          'Email está com problemas de recebimento. Devemos verificar: configuração do cliente, firewall, filtro de spam, cota de armazenamento, e DNS/MX records.',
        intent: 'suporte',
        examples: [
          'Não estou recebendo emails',
          'Meus emails vão para spam',
          'Email inteiro saiu',
        ],
        keywords: ['email', 'mensagem', 'não recebe', 'spam', 'problema'],
        created_by_user_id: ADMIN_USER_ID,
        usage_count: 0,
        approved_count: 5,
        metadata: { source: 'seed', category: 'email' },
      },
      {
        id: uuidv4(),
        company_id: COMPANY_ID,
        original_query: 'Quanto custa migração do meu site?',
        explanation:
          'Cliente quer saber o preço de migrar seu site de outro provedor. Devemos informar se é gratuito, quanto custa, tempo estimado, e garantia de zero downtime.',
        intent: 'preço',
        examples: [
          'Vocês migram site de graça?',
          'Quanto você cobra para migração?',
          'Quanto tempo leva para migrar?',
        ],
        keywords: ['migração', 'transferir', 'mudar', 'custo', 'gratuito'],
        created_by_user_id: ADMIN_USER_ID,
        usage_count: 0,
        approved_count: 2,
        metadata: { source: 'seed', category: 'produto' },
      },
      {
        id: uuidv4(),
        company_id: COMPANY_ID,
        original_query: 'Qual o melhor CMS para meu site?',
        explanation:
          'Cliente não sabe qual plataforma usar. Devemos entender seu tipo de site e recomendar: WordPress é mais fácil, Laravel/Node são mais flexíveis, Drupal para grandes projetos.',
        intent: 'geral',
        examples: [
          'Vocês suportam WordPress?',
          'Qual plataforma vocês recomendam?',
          'Posso usar Joomla no seu servidor?',
        ],
        keywords: ['cms', 'wordpress', 'plataforma', 'sistema', 'site'],
        created_by_user_id: ADMIN_USER_ID,
        usage_count: 0,
        approved_count: 2,
        metadata: { source: 'seed', category: 'consultoria' },
      },
    ];

    // Insert concepts with conflict handling
    for (const concept of concepts) {
      await sequelize.query(
        `
        INSERT INTO ai_learned_concepts (
          id, company_id, original_query, explanation, intent, 
          examples, keywords, created_by_user_id, usage_count, 
          approved_count, metadata, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
        `,
        {
          bind: [
            concept.id,
            concept.company_id,
            concept.original_query,
            concept.explanation,
            concept.intent,
            concept.examples,
            concept.keywords,
            concept.created_by_user_id,
            concept.usage_count,
            concept.approved_count,
            JSON.stringify(concept.metadata),
          ],
          type: sequelize.QueryTypes.INSERT,
        }
      );
    }

    // Verify insertion
    const count = await sequelize.query(
      'SELECT COUNT(*) FROM ai_learned_concepts WHERE company_id = :company_id',
      {
        replacements: { company_id: COMPANY_ID },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    console.log(`✓ Seeded ${concepts.length} learned concepts`);
    console.log(`Total concepts in database: ${count[0].count}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding learned concepts:', error);
    process.exit(1);
  }
}

seedLearnedConcepts();
