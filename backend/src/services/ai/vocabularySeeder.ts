/**
 * Vocabulary Seeder Service
 * Populates the AI vocabulary with common Portuguese words and their definitions
 * Creates a foundation of semantic knowledge for the AI
 */

// Common business and customer service related words with definitions
const BUSINESS_VOCABULARY = [
  {
    word: 'agendamento',
    definition: 'Ato ou processo de marcar uma data ou horário para uma consulta, atendimento ou serviço. Pode ser realizado presencialmente, por telefone ou através de plataformas online.',
    synonyms: ['marcação', 'reserva', 'horário marcado', 'consulta agendada'],
    examples: [
      'Como faço para agendar uma consulta?',
      'Qual é a disponibilidade para agendamento?',
      'Preciso remarcar meu agendamento',
      'O agendamento é feito com quanto tempo de antecedência?'
    ]
  },
  {
    word: 'atendimento',
    definition: 'Serviço prestado a um cliente ou usuário. Inclui a recepção, orientação, assistência e resolução de dúvidas ou problemas.',
    synonyms: ['serviço', 'assistência', 'suporte', 'acolhimento'],
    examples: [
      'Qual é o horário de atendimento?',
      'Como posso melhorar o atendimento?',
      'Preciso de atendimento urgente',
      'Qual é a qualidade do atendimento?'
    ]
  },
  {
    word: 'consulta',
    definition: 'Encontro ou sessão com um profissional para fins de diagnóstico, orientação ou prestação de serviço especializado.',
    synonyms: ['sessão', 'encontro', 'visita', 'avaliação'],
    examples: [
      'Preciso marcar uma consulta',
      'Qual é o valor da consulta?',
      'Quanto tempo dura uma consulta?',
      'A consulta inclui diagnóstico?'
    ]
  },
  {
    word: 'orçamento',
    definition: 'Estimativa do custo total de um serviço ou produto. Apresenta discriminação dos valores, prazos e condições de pagamento.',
    synonyms: ['cotação', 'proposta', 'estimativa', 'cálculo de preço'],
    examples: [
      'Pode me fazer um orçamento?',
      'Qual é o orçamento para este serviço?',
      'Preciso de um orçamento sem compromisso',
      'O orçamento inclui todas as despesas?'
    ]
  },
  {
    word: 'pagamento',
    definition: 'Ato de quitar uma dívida ou compensação pela prestação de um serviço ou venda de um produto. Pode ser realizado em dinheiro, cartão, transferência ou outras formas.',
    synonyms: ['quitação', 'liquidação', 'compensação', 'cobrança'],
    examples: [
      'Quais são as formas de pagamento?',
      'Qual é o prazo para pagamento?',
      'Posso parcelar o pagamento?',
      'O pagamento é à vista ou prazo?'
    ]
  },
  {
    word: 'promoção',
    definition: 'Estratégia comercial que oferece desconto, brinde ou vantagem especial para estimular a compra de um produto ou serviço.',
    synonyms: ['desconto', 'oferta', 'campanha', 'liquidação'],
    examples: [
      'Têm alguma promoção disponível?',
      'Qual é o desconto da promoção?',
      'Até quando dura a promoção?',
      'A promoção é válida para todos os produtos?'
    ]
  },
  {
    word: 'garantia',
    definition: 'Compromisso do fornecedor de reparar, substituir ou devolver o valor de um produto defeituoso dentro de um período específico.',
    synonyms: ['cobertura', 'proteção', 'segurança', 'compromisso'],
    examples: [
      'Qual é o período de garantia?',
      'O serviço tem garantia?',
      'Como aciono a garantia?',
      'A garantia cobre danos acidentais?'
    ]
  },
  {
    word: 'cancelamento',
    definition: 'Ato de rescindir ou suspender um contrato, agendamento, pedido ou serviço que foi previamente confirmado.',
    synonyms: ['rescisão', 'suspensão', 'encerramento', 'anulação'],
    examples: [
      'Como faço para cancelar meu serviço?',
      'Qual é a política de cancelamento?',
      'Há multa por cancelamento?',
      'Preciso cancelar meu agendamento'
    ]
  },
  {
    word: 'horário',
    definition: 'Período ou momento específico durante o qual um estabelecimento funciona ou oferece um serviço. Define os dias da semana e horas de funcionamento.',
    synonyms: ['funcionamento', 'expediente', 'período', 'turno'],
    examples: [
      'Qual é o horário de funcionamento?',
      'Vocês atendem em qual horário?',
      'Qual é o melhor horário para visitar?',
      'O horário varia nos fins de semana?'
    ]
  },
  {
    word: 'localização',
    definition: 'Identificação do endereço ou lugar onde uma empresa, estabelecimento ou serviço está situado. Pode incluir referências para facilitar o acesso.',
    synonyms: ['endereço', 'local', 'onde fica', 'ponto de funcionamento'],
    examples: [
      'Qual é a localização de vocês?',
      'Como chego até aí?',
      'Vocês têm alguma filial?',
      'Qual é o endereço mais próximo de mim?'
    ]
  },
  {
    word: 'dúvida',
    definition: 'Incerteza ou falta de clareza sobre um assunto, dúvida. Sentimento de estar indeciso ou questionador sobre algo.',
    synonyms: ['incerteza', 'questionamento', 'pergunta', 'indefinição'],
    examples: [
      'Tenho uma dúvida sobre o serviço',
      'Pode esclarecer esta dúvida?',
      'Ficou alguma dúvida?',
      'Qual é sua dúvida?'
    ]
  },
  {
    word: 'comunicação',
    definition: 'Troca de informações, mensagens ou diálogo entre duas ou mais pessoas. Fundamental para manter relacionamento efetivo.',
    synonyms: ['diálogo', 'mensagem', 'contato', 'interação'],
    examples: [
      'Como faço para entrar em contato?',
      'Qual é o melhor meio de comunicação?',
      'Podemos conversar sobre isto?',
      'Qual é o canal de comunicação?'
    ]
  },
  {
    word: 'feedback',
    definition: 'Retorno ou resposta sobre o desempenho, qualidade ou satisfação com um serviço. Informação importante para melhoria contínua.',
    synonyms: ['avaliação', 'opinião', 'comentário', 'retorno'],
    examples: [
      'Gostaria de deixar um feedback',
      'Qual é sua opinião sobre o serviço?',
      'Pode me dar um feedback?',
      'Seu feedback é muito importante'
    ]
  },
  {
    word: 'suporte',
    definition: 'Assistência técnica ou apoio prestado a clientes para resolver problemas, dúvidas ou dificuldades com um produto ou serviço.',
    synonyms: ['assistência', 'ajuda', 'apoio técnico', 'socorro'],
    examples: [
      'Como faço para obter suporte?',
      'Preciso de suporte técnico',
      'Qual é o horário do suporte?',
      'O suporte é 24 horas?'
    ]
  },
  {
    word: 'problema',
    definition: 'Situação ou questão que causa dificuldade, insatisfação ou necessidade de solução. Pode ser técnico, operacional ou comercial.',
    synonyms: ['dificuldade', 'obstáculo', 'inconveniente', 'questão'],
    examples: [
      'Estou com um problema',
      'Como resolver este problema?',
      'Qual é o problema?',
      'Tem havido algum problema?'
    ]
  },
  {
    word: 'solução',
    definition: 'Resposta, resolução ou alternativa para solucionar um problema, dúvida ou necessidade do cliente.',
    synonyms: ['resolução', 'resposta', 'saída', 'alternativa'],
    examples: [
      'Qual é a solução para isto?',
      'Tem alguma solução?',
      'Precisamos encontrar uma solução',
      'A solução é simples'
    ]
  },
  {
    word: 'qualidade',
    definition: 'Grau de excelência, perfeição ou adequação de um produto ou serviço em relação aos padrões esperados.',
    synonyms: ['nível', 'padrão', 'excelência', 'desempenho'],
    examples: [
      'Qual é a qualidade do serviço?',
      'Garantimos qualidade',
      'A qualidade é nossa prioridade',
      'Você ficou satisfeito com a qualidade?'
    ]
  },
  {
    word: 'disponibilidade',
    definition: 'Condição de estar disponível ou livre para atender, servir ou realizar uma ação. Refere-se a horários, recursos ou prontidão.',
    synonyms: ['prontidão', 'abertura', 'flexibilidade', 'acesso'],
    examples: [
      'Qual é a sua disponibilidade?',
      'Temos disponibilidade para atender',
      'Qual é a próxima disponibilidade?',
      'A disponibilidade é limitada'
    ]
  },
  {
    word: 'satisfação',
    definition: 'Sentimento de contentamento, alegria ou cumprimento das expectativas com relação a um produto, serviço ou atendimento.',
    synonyms: ['contentamento', 'alegria', 'aprovação', 'realização'],
    examples: [
      'Sua satisfação é importante para nós',
      'Ficou satisfeito?',
      'A satisfação do cliente é nossa meta',
      'Como é sua satisfação com o serviço?'
    ]
  },
  {
    word: 'responsabilidade',
    definition: 'Obrigação de responder pelos atos, decisões ou resultados de um serviço. Compromisso com a excelência e cumprimento de promessas.',
    synonyms: ['dever', 'obrigação', 'comprometimento', 'accountability'],
    examples: [
      'Temos responsabilidade sobre isto',
      'Assumimos responsabilidade',
      'Qual é a responsabilidade?',
      'É nossa responsabilidade resolver'
    ]
  }
];

// Common action verbs and service-related words
const COMMON_VERBS = [
  {
    word: 'ajudar',
    definition: 'Prestar assistência, apoio ou colaboração para alguém resolver um problema ou atingir um objetivo.',
    synonyms: ['auxiliar', 'socorrer', 'colaborar', 'apoiar'],
    examples: [
      'Como posso ajudar?',
      'Preciso de ajuda',
      'Vou ajudá-lo',
      'Posso ajudá-lo com algo?'
    ]
  },
  {
    word: 'entender',
    definition: 'Compreender, absorver ou tomar conhecimento de algo. Ter clareza sobre um assunto ou mensagem.',
    synonyms: ['compreender', 'perceber', 'captar', 'assimilar'],
    examples: [
      'Você entende?',
      'Entendo seu problema',
      'Não entendi bem',
      'Você compreende a situação?'
    ]
  },
  {
    word: 'resolver',
    definition: 'Encontrar solução, decisão ou término para um problema, dúvida ou situação pendente.',
    synonyms: ['solucionar', 'decidir', 'encerrar', 'finalizar'],
    examples: [
      'Vou resolver isto',
      'Como resolver?',
      'Precisamos resolver logo',
      'Já foi resolvido?'
    ]
  },
  {
    word: 'contatar',
    definition: 'Estabelecer comunicação, enviar mensagem ou procurar alguém através de diversos meios.',
    synonyms: ['comunicar', 'ligar', 'escrever', 'chamar'],
    examples: [
      'Como posso contatá-lo?',
      'Entre em contato conosco',
      'Vou contatá-lo amanhã',
      'Onde posso contatá-los?'
    ]
  },
  {
    word: 'enviar',
    definition: 'Remeter, transmitir ou encaminhar algo a um destinatário através de diversos meios.',
    synonyms: ['remeter', 'transmitir', 'encaminhar', 'mandar'],
    examples: [
      'Posso enviar um arquivo?',
      'Vou enviar por email',
      'Já foi enviado?',
      'Pode enviar para este número?'
    ]
  },
  {
    word: 'confirmar',
    definition: 'Validar, ratificar ou assegurar que algo está correto, verdadeiro ou será cumprido.',
    synonyms: ['validar', 'ratificar', 'assegurar', 'certificar'],
    examples: [
      'Pode confirmar isto?',
      'Confirmo sua reserva',
      'Precisa confirmar?',
      'Está confirmado?'
    ]
  }
];

interface VocabularyEntry {
  word: string;
  definition: string;
  synonyms: string[];
  examples: string[];
}

export async function seedVocabulary(companyId: string, models: any): Promise<any> {
  try {
    console.log('[Vocabulary Seeder] Starting vocabulary seed for company:', companyId);

    const company = await models.Company.findByPk(companyId);
    if (!company) {
      throw new Error(`Company ${companyId} not found`);
    }

    // Combine all vocabulary
    const allVocabulary: VocabularyEntry[] = [...BUSINESS_VOCABULARY, ...COMMON_VERBS];

    // Add IDs based on timestamp to ensure uniqueness
    const vocabularyWithIds = allVocabulary.map((entry, index) => ({
      ...entry,
      id: `vocab-${Date.now()}-${index}`,
      created_at: new Date().toISOString()
    }));

    // Get existing vocabulary
    const metadata = company.metadata || {};
    const existingVocab = metadata.vocabulary || [];

    // Merge: keep existing, add new ones that don't exist
    const existingWords = new Set(existingVocab.map((v: any) => v.word.toLowerCase()));
    const newWords = vocabularyWithIds.filter(
      (v) => !existingWords.has(v.word.toLowerCase())
    );

    // Update company metadata with merged vocabulary
    const mergedVocabulary = [...existingVocab, ...newWords];
    company.metadata = {
      ...metadata,
      vocabulary: mergedVocabulary,
      vocabulary_seeded_at: new Date().toISOString(),
      vocabulary_count: mergedVocabulary.length
    };

    await company.save();

    console.log(`[Vocabulary Seeder] ✓ Seeded ${newWords.length} new words for company ${companyId}`);
    console.log(`[Vocabulary Seeder] Total vocabulary: ${mergedVocabulary.length} words`);

    return {
      success: true,
      seeded: newWords.length,
      total: mergedVocabulary.length,
      words: newWords.map((w: any) => w.word)
    } as any;
  } catch (error) {
    console.error('[Vocabulary Seeder] Error seeding vocabulary:', error);
    throw error;
  }
}

export function getVocabularyStats(): { categories: number; words: number; examples: number } {
  const totalWords = BUSINESS_VOCABULARY.length + COMMON_VERBS.length;
  const totalExamples = [
    ...BUSINESS_VOCABULARY,
    ...COMMON_VERBS
  ].reduce((sum, entry) => sum + (entry.examples?.length || 0), 0);

  return {
    categories: 2,
    words: totalWords,
    examples: totalExamples
  };
}
