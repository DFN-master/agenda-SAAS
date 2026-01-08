# Agenda-Sys

Agenda-Sys é um sistema SaaS inteligente para gerenciamento de agendas, integrações com WhatsApp e email, e automação de tarefas com IA. Ele é projetado para atender empresas que precisam de uma solução eficiente para comunicação e organização.

## Funcionalidades

- **Integração com WhatsApp**: Gerencie mensagens e conexões usando o WhatsMeow.
- **Integração com Email**: Envio e recebimento de emails com suporte a SMTP, IMAP e POP.
- **Automação com IA**: Resuma emails e automatize respostas usando OpenAI.
- **Gerenciamento de Planos**: Controle limites de conexões e acessos por meio de planos de assinatura.
- **Painel de Super Admin**: Gerencie empresas, planos e integrações.

## Tecnologias Utilizadas

### Backend
- **Node.js** com **TypeScript**
- **Sequelize** para ORM e migrações
- **Express** para API
- **Nodemailer** para envio de emails
- **WhatsMeow** para integração com WhatsApp

### Frontend
- **React** com **Vite**

### Microserviços
- **Python** para automação de emails com OpenAI

## Estrutura do Projeto

```
Agenda-Sys/
├── backend/                # Backend em Node.js
│   ├── src/
│   │   ├── models/        # Modelos Sequelize
│   │   ├── migrations/    # Migrações do banco de dados
│   │   ├── seeders/       # Seeders para dados iniciais
│   │   ├── services/      # Serviços (WhatsApp, Email, etc.)
│   │   └── index.ts       # Ponto de entrada do backend
│   └── package.json       # Configuração do backend
├── frontend/               # Frontend em React
│   ├── src/
│   │   ├── pages/         # Páginas React
│   │   ├── App.jsx        # Componente principal
│   │   └── main.jsx       # Ponto de entrada do frontend
│   └── package.json       # Configuração do frontend
├── ai-service/             # Microserviço de IA
│   └── email_summary.py    # Script Python para automação de emails
└── README.md               # Documentação do projeto
```

## Configuração

### Pré-requisitos
- **Node.js** (v16 ou superior)
- **Python** (v3.8 ou superior)
- **PostgreSQL** ou outro banco de dados compatível

### Passos
1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/agenda-sys.git
   ```
2. Instale as dependências:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. Configure as variáveis de ambiente:
   - Crie um arquivo `.env` no diretório `backend` com as seguintes variáveis:
     ```env
     DATABASE_URL=postgres://usuario:senha@localhost:5432/agenda_sys
     EMAIL_HOST=smtp.exemplo.com
     EMAIL_PORT=587
     EMAIL_USER=seu-email@exemplo.com
     EMAIL_PASS=sua-senha
     EMAIL_FROM=seu-email@exemplo.com
     IMAP_HOST=imap.exemplo.com
     IMAP_PORT=993
     IMAP_TLS=true
     OPENAI_API_KEY=sua-chave-openai
     ```
4. Execute as migrações e seeders:
   ```bash
   npx sequelize-cli db:migrate
   npx sequelize-cli db:seed:all
   ```
5. Inicie os serviços:
   - Backend:
     ```bash
     npm run dev
     ```
   - Frontend:
     ```bash
     npm start
     ```
   - Microserviço de IA:
     ```bash
     python ai-service/email_summary.py
     ```

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e enviar pull requests.

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).