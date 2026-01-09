import { QueryInterface } from 'sequelize';

// Seeder para popular base de conhecimento com FAQs de TI e Suporte
export async function up(queryInterface: QueryInterface): Promise<void> {
  const companyId = '99999999-9999-9999-9999-999999999999'; // Test company

  await queryInterface.bulkInsert('ai_knowledge_base', [
    // Preços e Planos
    {
      id: '00000001-0000-0000-0000-000000000001',
      company_id: companyId,
      title: 'Planos de Hospedagem Web',
      content: `Oferecemos planos de hospedagem compartilhada a partir de R$29,90/mês com 10GB SSD, SSL grátis e suporte 24/7. Plano Intermediário: R$59,90/mês com 50GB SSD. Plano Premium: R$99,90/mês com 100GB SSD e backup diário.`,
      tags: ['preço', 'hospedagem', 'planos'],
      intent: 'preço',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: '00000001-0000-0000-0000-000000000002',
      company_id: companyId,
      title: 'Pacotes de Suporte Técnico',
      content: `Suporte Básico: R$150/mês (10h suporte remoto). Suporte Plus: R$350/mês (30h suporte + visita presencial). Suporte Enterprise: R$800/mês (ilimitado + SLA 4h).`,
      tags: ['preço', 'suporte', 'pacotes'],
      intent: 'preço',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: '00000001-0000-0000-0000-000000000003',
      company_id: companyId,
      title: 'Servidores VPS e Cloud',
      content: `VPS Básico: R$89/mês (2vCPU, 4GB RAM, 80GB SSD). VPS Pro: R$189/mês (4vCPU, 8GB RAM, 160GB SSD). Cloud Enterprise: a partir de R$499/mês com alta disponibilidade.`,
      tags: ['preço', 'vps', 'cloud'],
      intent: 'preço',
      created_at: new Date(),
      updated_at: new Date(),
    },

    // Agendamento e Horários
    {
      id: '00000001-0000-0000-0000-000000000004',
      company_id: companyId,
      title: 'Como agendar visita técnica',
      content: `Para agendar visita técnica presencial, informe: preferência de data/horário, endereço, descrição breve do problema. Atendemos segunda a sexta 8h-18h, sábados 9h-13h. Confirmo disponibilidade em até 2 horas.`,
      tags: ['agendamento', 'visita', 'horário'],
      intent: 'agendamento',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: '00000001-0000-0000-0000-000000000005',
      company_id: companyId,
      title: 'Agendamento de treinamento',
      content: `Oferecemos treinamentos personalizados em TI (Windows Server, Linux, Redes, Backup). Duração típica: 4-8h. Agendamento com 7 dias de antecedência. Valores: R$600/dia para até 5 pessoas.`,
      tags: ['agendamento', 'treinamento', 'capacitação'],
      intent: 'agendamento',
      created_at: new Date(),
      updated_at: new Date(),
    },

    // Suporte Técnico e Resolução de Problemas
    {
      id: '00000001-0000-0000-0000-000000000006',
      company_id: companyId,
      title: 'Servidor fora do ar - Primeiros passos',
      content: `Se o servidor estiver inacessível: 1) Verifique conectividade (ping). 2) Cheque painel de controle/status do datacenter. 3) Acesse console remoto se disponível. 4) Reinicie via painel (último recurso). Se persistir, abra ticket urgente com logs.`,
      tags: ['suporte', 'servidor', 'downtime'],
      intent: 'suporte',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: '00000001-0000-0000-0000-000000000007',
      company_id: companyId,
      title: 'Problemas de e-mail - Diagnóstico',
      content: `Sintomas comuns: não envia/recebe, erro de autenticação, caixa cheia. Soluções: 1) Verifique configuração SMTP/IMAP. 2) Confirme senha. 3) Esvazie caixa de spam. 4) Cheque cota. 5) Revise SPF/DKIM. Se persistir, envie prints de erro.`,
      tags: ['suporte', 'email', 'problemas'],
      intent: 'suporte',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: '00000001-0000-0000-0000-000000000008',
      company_id: companyId,
      title: 'Lentidão de rede - Troubleshooting',
      content: `Passos: 1) Teste velocidade (speedtest). 2) Reinicie roteador/switches. 3) Verifique uso de banda (possível saturação). 4) Scan de malware. 5) Revise regras de firewall/QoS. Envie traceroute para análise detalhada.`,
      tags: ['suporte', 'rede', 'lentidão'],
      intent: 'suporte',
      created_at: new Date(),
      updated_at: new Date(),
    },

    // Localização e Contato
    {
      id: '00000001-0000-0000-0000-000000000009',
      company_id: companyId,
      title: 'Endereço e localização',
      content: `Estamos localizados na Av. Tecnológica, 1234 - Sala 501, Centro, São Paulo - SP, CEP 01000-000. Próximo ao metrô República. Estacionamento conveniado disponível. Horário comercial: seg-sex 9h-18h.`,
      tags: ['localização', 'endereço', 'contato'],
      intent: 'localização',
      created_at: new Date(),
      updated_at: new Date(),
    },

    // Cancelamento
    {
      id: '00000001-0000-0000-0000-000000000010',
      company_id: companyId,
      title: 'Política de cancelamento',
      content: `Cancelamentos podem ser solicitados a qualquer momento. Planos mensais: sem multa, aviso de 30 dias. Planos anuais: reembolso proporcional (desconto 20% taxa administrativa). Dados mantidos por 30 dias após cancelamento.`,
      tags: ['cancelamento', 'política', 'reembolso'],
      intent: 'cancelamento',
      created_at: new Date(),
      updated_at: new Date(),
    },

    // Geral - Produtos e Serviços
    {
      id: '00000001-0000-0000-0000-000000000011',
      company_id: companyId,
      title: 'Portfólio de Serviços de TI',
      content: `Oferecemos: Hospedagem Web e E-mail, Servidores VPS e Dedicados, Suporte Técnico Remoto e Presencial, Backup e Disaster Recovery, Consultoria em Infraestrutura, Segurança da Informação, Desenvolvimento e Integração de Sistemas.`,
      tags: ['geral', 'serviços', 'portfólio'],
      intent: 'geral',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: '00000001-0000-0000-0000-000000000012',
      company_id: companyId,
      title: 'Backup e recuperação de dados',
      content: `Soluções de backup: incremental diário, backup completo semanal, retenção de 30 dias. Armazenamento em datacenter redundante. Teste de restore trimestral. Recuperação de desastres: RTO 4h, RPO 24h (plano Enterprise).`,
      tags: ['backup', 'recuperação', 'dados'],
      intent: 'geral',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('ai_knowledge_base', {
    company_id: '99999999-9999-9999-9999-999999999999',
  });
}
