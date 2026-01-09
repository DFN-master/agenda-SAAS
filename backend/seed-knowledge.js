require('dotenv').config();
const { sequelize } = require('./dist/models');

const companyId = '99999999-9999-9999-9999-999999999999';

const knowledge = [
  {
    title: 'Planos de Hospedagem Web',
    content: `Oferecemos planos de hospedagem compartilhada a partir de R$29,90/mês com 10GB SSD, SSL grátis e suporte 24/7. Plano Intermediário: R$59,90/mês com 50GB SSD. Plano Premium: R$99,90/mês com 100GB SSD e backup diário.`,
    tags: ['preço', 'hospedagem', 'planos'],
    intent: 'preço',
  },
  {
    title: 'Pacotes de Suporte Técnico',
    content: `Suporte Básico: R$150/mês (10h suporte remoto). Suporte Plus: R$350/mês (30h suporte + visita presencial). Suporte Enterprise: R$800/mês (ilimitado + SLA 4h).`,
    tags: ['preço', 'suporte', 'pacotes'],
    intent: 'preço',
  },
  {
    title: 'Servidores VPS e Cloud',
    content: `VPS Básico: R$89/mês (2vCPU, 4GB RAM, 80GB SSD). VPS Pro: R$189/mês (4vCPU, 8GB RAM, 160GB SSD). Cloud Enterprise: a partir de R$499/mês com alta disponibilidade.`,
    tags: ['preço', 'vps', 'cloud'],
    intent: 'preço',
  },
  {
    title: 'Como agendar visita técnica',
    content: `Para agendar visita técnica presencial, informe: preferência de data/horário, endereço, descrição breve do problema. Atendemos segunda a sexta 8h-18h, sábados 9h-13h. Confirmo disponibilidade em até 2 horas.`,
    tags: ['agendamento', 'visita', 'horário'],
    intent: 'agendamento',
  },
  {
    title: 'Agendamento de treinamento',
    content: `Oferecemos treinamentos personalizados em TI (Windows Server, Linux, Redes, Backup). Duração típica: 4-8h. Agendamento com 7 dias de antecedência. Valores: R$600/dia para até 5 pessoas.`,
    tags: ['agendamento', 'treinamento', 'capacitação'],
    intent: 'agendamento',
  },
  {
    title: 'Servidor fora do ar - Primeiros passos',
    content: `Se o servidor estiver inacessível: 1) Verifique conectividade (ping). 2) Cheque painel de controle/status do datacenter. 3) Acesse console remoto se disponível. 4) Reinicie via painel (último recurso). Se persistir, abra ticket urgente com logs.`,
    tags: ['suporte', 'servidor', 'downtime'],
    intent: 'suporte',
  },
  {
    title: 'Problemas de e-mail - Diagnóstico',
    content: `Sintomas comuns: não envia/recebe, erro de autenticação, caixa cheia. Soluções: 1) Verifique configuração SMTP/IMAP. 2) Confirme senha. 3) Esvazie caixa de spam. 4) Cheque cota. 5) Revise SPF/DKIM. Se persistir, envie prints de erro.`,
    tags: ['suporte', 'email', 'problemas'],
    intent: 'suporte',
  },
  {
    title: 'Lentidão de rede - Troubleshooting',
    content: `Passos: 1) Teste velocidade (speedtest). 2) Reinicie roteador/switches. 3) Verifique uso de banda (possível saturação). 4) Scan de malware. 5) Revise regras de firewall/QoS. Envie traceroute para análise detalhada.`,
    tags: ['suporte', 'rede', 'lentidão'],
    intent: 'suporte',
  },
  {
    title: 'Endereço e localização',
    content: `Estamos localizados na Av. Tecnológica, 1234 - Sala 501, Centro, São Paulo - SP, CEP 01000-000. Próximo ao metrô República. Estacionamento conveniado disponível. Horário comercial: seg-sex 9h-18h.`,
    tags: ['localização', 'endereço', 'contato'],
    intent: 'localização',
  },
  {
    title: 'Política de cancelamento',
    content: `Cancelamentos podem ser solicitados a qualquer momento. Planos mensais: sem multa, aviso de 30 dias. Planos anuais: reembolso proporcional (desconto 20% taxa administrativa). Dados mantidos por 30 dias após cancelamento.`,
    tags: ['cancelamento', 'política', 'reembolso'],
    intent: 'cancelamento',
  },
  {
    title: 'Portfólio de Serviços de TI',
    content: `Oferecemos: Hospedagem Web e E-mail, Servidores VPS e Dedicados, Suporte Técnico Remoto e Presencial, Backup e Disaster Recovery, Consultoria em Infraestrutura, Segurança da Informação, Desenvolvimento e Integração de Sistemas.`,
    tags: ['geral', 'serviços', 'portfólio'],
    intent: 'geral',
  },
  {
    title: 'Backup e recuperação de dados',
    content: `Soluções de backup: incremental diário, backup completo semanal, retenção de 30 dias. Armazenamento em datacenter redundante. Teste de restore trimestral. Recuperação de desastres: RTO 4h, RPO 24h (plano Enterprise).`,
    tags: ['backup', 'recuperação', 'dados'],
    intent: 'geral',
  },
];

async function seed() {
  for (const item of knowledge) {
    await sequelize.query(`
      INSERT INTO ai_knowledge_base (company_id, title, content, tags, intent, created_at, updated_at)
      VALUES (:companyId, :title, :content, ARRAY[:tags]::text[], :intent, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, {
      replacements: {
        companyId,
        title: item.title,
        content: item.content,
        tags: item.tags.join(','),
        intent: item.intent,
      },
    });
  }
  console.log('✓ Base de conhecimento populada com', knowledge.length, 'entradas');
  process.exit(0);
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});
