## Painel de Usuário

O painel de usuário oferece as seguintes seções:

* **Dashboard** – Visão geral do uso do sistema.
* **Integrações** – Gerencie conexões de WhatsApp, Email e outras.
* **Planos** – Visualize e altere seu plano de assinatura.
* **Relatórios** – Acesse relatórios detalhados.
* **Workflow** – Configure fluxos de atendimento.
* **Configurações** – Gerencie preferências e conta.
* **Admin Integrations** – Permite que o administrador da empresa crie e gerencie conexões de WhatsApp, Email e outras integrações.

## Estrutura de Arquivos

```
frontend/src/
├── components/
│   ├── Dashboard.jsx
│   ├── Integrations/
│   │   ├── WhatsAppIntegration.jsx
│   │   ├── EmailIntegration.jsx
│   │   └── AdminIntegrations.jsx
│   ├── Plans.jsx
│   ├── Reports.jsx
│   ├── Settings.jsx
│   └── Workflow/Workflow.jsx
├── pages/
│   ├── UserPanel.jsx
│   └── Login.jsx
├── App.jsx
└── main.jsx
```

## Como Contribuir

Contribuições são bem‑vindas! Siga os passos abaixo:

1. Fork o repositório.
2. Crie uma branch com a sua feature: `git checkout -b feature/nome-da-feature`.
3. Commit suas alterações: `git commit -m "Adiciona nova feature"`.
4. Push para a branch: `git push origin feature/nome-da-feature`.
5. Abra um Pull Request.

## Licença

MIT License.

---

Para mais detalhes, consulte a documentação completa no repositório.
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