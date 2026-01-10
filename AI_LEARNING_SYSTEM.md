# IA com Aprendizado de Vocabulário Dinâmico

## Resumo Executivo

A IA agora é **semanticamente inteligente e autoaprendizável**:

1. **Compreensão Semântica**: A IA interpreta o significado das palavras de uma mensagem, em vez de apenas fazer correspondência de palavras-chave.
2. **Aprendizado Dinâmico**: Quando encontra uma palavra desconhecida, a IA:
   - Registra a palavra como **pendente de aprovação**
   - Notifica o administrador
   - Aguarda que o admin forneça o significado
3. **Reutilização**: Após aprovação pelo admin, a IA **usa o novo significado imediatamente** em futuras respostas.
4. **Composição Generativa**: A IA compõe respostas dinamicamente com base nos significados das palavras, em vez de recuperar respostas prontas do banco.

---

## Arquitetura

### Backend (Node.js + TypeScript)

#### Novos Arquivos
- **[backend/src/models/aiWordMeaning.ts](../backend/src/models/aiWordMeaning.ts)**
  - Modelo Sequelize para armazenar significados de palavras por empresa
  - Campos: `word`, `definition`, `source_url`, `status` (pending|approved|rejected)

- **[backend/src/migrations/20260110000003-create-ai-word-meanings.ts](../backend/src/migrations/20260110000003-create-ai-word-meanings.ts)**
  - Cria tabela `ai_word_meanings` com índice único `(company_id, word)`

- **[backend/src/routes/aiWordMeaningRoutes.ts](../backend/src/routes/aiWordMeaningRoutes.ts)**
  - Endpoints para admin gerenciar significados:
    - `GET /api/ai/word-meanings?company_id=uuid&status=pending` – listar pendências
    - `PATCH /api/ai/word-meanings/:id` – aprovar e definir significado
    - `DELETE /api/ai/word-meanings/:id` – rejeitar palavra

#### Alterações
- **[backend/src/index.ts](../backend/src/index.ts)**: Registra rota `aiWordMeaningRoutes`
- **[backend/src/models/index.ts](../backend/src/models/index.ts)**: Inclui `AiWordMeaning`

### IA (Python + Flask)

#### Novos Componentes
- **`fetch_approved_word_meanings(company_id)`**: Busca significados aprovados do banco
- **`upsert_word_meaning(company_id, word, definition, status)`**: Registra palavra como pendente
- **`interpret_semantics(tokens, company_id)`**: 
  - Interpreta tokens contra léxico builtin
  - Consulta significados aprovados pela admin
  - Registra desconhecidos como pendentes

#### Alterações no `cognitive_engine.py`
- Léxico semântico expandido (tópicos: comercial, operacional, técnico, atendimento, financeiro)
- Processamento de tokens com normalização e stopwords em português
- Resposta generativa com significados das palavras, em vez de respostas pré-gravadas
- Notificação ao usuário sobre palavras novas pendentes de aprovação

---

## Fluxo de Uso

### 1. Usuário envia mensagem via WhatsApp
```
"O que é foobarismo?"
```

### 2. IA processa a mensagem
```
- Tokeniza: ["foobarismo"]
- Procura no léxico builtin: não encontra
- Procura em significados aprovados: não encontra
- Registra como "pending" no banco
- Retorna resposta indicando palavra desconhecida
```

### 3. Admin recebe notificação
Admin acessa:
```bash
GET http://localhost:3000/api/ai/word-meanings?company_id=99999999-9999-9999-9999-999999999999&status=pending
```

Retorna:
```json
[
  {
    "id": "9ba8a794-1aab-4389-b917-9b4a922b99c1",
    "word": "foobarismo",
    "status": "pending",
    "definition": null
  }
]
```

### 4. Admin aprova e define significado
```bash
PATCH http://localhost:3000/api/ai/word-meanings/9ba8a794-1aab-4389-b917-9b4a922b99c1
Body: {
  "definition": "Uma aplicação ou metodologia fictícia usada em exemplos de programação.",
  "status": "approved"
}
```

### 5. Próxima mensagem similar usa o novo significado
```
"O que é foobarismo?"
Resposta: "Entendi o tema principal: custom.
📚 Foobarismo: Uma aplicação ou metodologia fictícia usada em exemplos de programação.
..."
```

---

## Endpoints da API

### Listar Palavras Pendentes
```http
GET /api/ai/word-meanings?company_id=<uuid>&status=pending&limit=50&offset=0
```
**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "word": "foobarismo",
      "definition": null,
      "status": "pending",
      "created_at": "2026-01-10T03:07:31.110Z"
    }
  ],
  "total": 1
}
```

### Aprovar Palavra e Definir Significado
```http
PATCH /api/ai/word-meanings/:id
Content-Type: application/json

{
  "definition": "Descrição da palavra...",
  "status": "approved"
}
```

### Rejeitar Palavra
```http
DELETE /api/ai/word-meanings/:id
```

---

## Configuração

### Backend
1. Build:
```bash
cd backend
npm run build
```

2. Migrations (se necessário):
```bash
npm run db:migrate
```

### IA Service
1. Dependencies já estão em `requirements.txt`
2. Reiniciar via PM2:
```bash
pm2 restart cognitive-engine
```

---

## Exemplo Completo

### 1. Enviar mensagem com palavra desconhecida
```bash
curl -X POST http://localhost:5001/cognitive-response \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "99999999-9999-9999-9999-999999999999",
    "incoming_message": "Explique sobre blockchain",
    "intent": "tecnico",
    "context_summary": ""
  }'
```

**Resposta:**
```json
{
  "suggested_response": "Recebi sua mensagem sobre tecnico. Estou analisando para formular a melhor resposta.\n\n🔎 Detectei palavras novas que ainda não conheço:\n- **blockchain**: (Aguardando significado do administrador)\n\nPor favor, defina o significado dessas palavras...",
  "semantics": {
    "new_words": [{"word": "blockchain", "status": "pending"}]
  }
}
```

### 2. Admin aprova a palavra
```bash
# Listar pendências
curl http://localhost:3000/api/ai/word-meanings?company_id=99999999-9999-9999-9999-999999999999&status=pending

# Aprovar
curl -X PATCH http://localhost:3000/api/ai/word-meanings/<id> \
  -H "Content-Type: application/json" \
  -d '{
    "definition": "Tecnologia de registro distribuído e criptografado...",
    "status": "approved"
  }'
```

### 3. Próxima mensagem usa o novo significado
```bash
curl -X POST http://localhost:5001/cognitive-response \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "99999999-9999-9999-9999-999999999999",
    "incoming_message": "Me explica blockchain",
    "intent": "tecnico",
    "context_summary": ""
  }'
```

**Resposta:**
```json
{
  "suggested_response": "Entendi o tema principal: custom.\n📚 **Blockchain**: Tecnologia de registro distribuído e criptografado...\n\nPosso esclarecer algo mais específico?"
}
```

---

## Benefícios

✅ **IA Inteligente**: Compreende significados, não apenas palavras  
✅ **Autoaprendizável**: Aprende com aprovação do admin  
✅ **Respostas Generativas**: Compõe respostas dinamicamente  
✅ **Escalável**: Cada empresa tem seu próprio vocabulário  
✅ **Seguro**: Admin controla o que a IA aprende  

---

## Próximas Melhorias

1. **Integração com APIs externas**: Buscar definições automaticamente (Wikipedia, Dicionários)
2. **NLP avançado**: Integrar spaCy ou NLTK para lemmatização melhorada
3. **Embeddings**: Usar sentence-transformers para compreensão mais profunda
4. **Histórico**: Rastrear aprovações e rejeições por admin
5. **Sugestões inteligentes**: IA propor categorias/tópicos para novas palavras
6. **Sincronização**: Compartilhar vocabulário entre múltiplas empresas (opcional)

---

## Arquivo de Referência

Veja [ai-service/cognitive_engine.py](../ai-service/cognitive_engine.py) para implementação completa.

