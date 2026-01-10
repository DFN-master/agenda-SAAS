# 🔐 Guia de Isolamento Multi-Tenant (SaaS)
## Agenda-Sys - Requisitos de Segurança e Isolamento de Dados

**Data**: Janeiro 2026  
**Status**: ✅ IMPLEMENTADO  
**Versão**: 1.0

---

## 1️⃣ Arquitetura de Isolamento

### 1.1 Isolamento por Company ID

Todas as requisições ao serviço de IA **EXIGEM** um `company_id` válido:

```json
POST /cognitive-response
{
  "company_id": "550e8400-e29b-41d4-a716-446655440000",  // OBRIGATÓRIO
  "incoming_message": "Gostaria de agendar...",
  "context_summary": "..."
}
```

**Validações:**
- ✅ `company_id` é obrigatório
- ✅ Deve ser um UUID válido
- ✅ Middleware valida antes de processar
- ✅ Request sem company_id retorna 400

### 1.2 Cache Isolado por Tenant

Sistema de cache multi-tenant implementado em `TenantCache`:

```python
# Cache keys: "company_id:key_name"
# Exemplo: "550e8400-e29b-41d4-a716-446655440000:word_meanings"

cache_key = f"{company_id}:{resource_name}"
```

**Características:**
- Cache isolado por empresa
- TTL de 1 hora por padrão
- Método `clear(company_id)` limpa apenas dados da empresa
- Logs indicam qual empresa está acessando

### 1.3 Banco de Dados Multi-Tenant

**Todas as queries filtram por `company_id`:**

```sql
-- ✅ CORRETO: Filtra por company_id
SELECT * FROM ai_learned_concepts 
WHERE company_id = %s  -- Obrigatório!

-- ❌ ERRADO: Sem filtro por company_id
SELECT * FROM ai_learned_concepts
```

---

## 2️⃣ Camadas de Isolamento

### Camada 1: Validação de Entrada
```python
# Middleware @app.before_request valida:
1. Presença de company_id
2. Formato UUID válido
3. Request é rejeitada se inválida
```

### Camada 2: Cache Isolado
```python
# TenantCache separa dados:
- Vocabulário por empresa
- Conceitos aprendidos por empresa
- Histórico de sugestões por empresa
```

### Camada 3: Queries Filtradas
```sql
-- Todas as queries adicionam:
WHERE company_id = %s
```

### Camada 4: Auditoria e Logs
```python
logger.info(f'[TENANT:{company_id}] Cognitive request: ...')
# Rastreia qual empresa fez cada requisição
```

---

## 3️⃣ Endpoints Protegidos

### 3.1 Endpoint Principal (Público)

**`POST /cognitive-response`**
- Requer `company_id`
- Valida UUID
- Filtra todos os dados por `company_id`

### 3.2 Endpoints Admin (Protegidos)

**`POST /admin/cache/clear`**
```bash
curl -X POST http://localhost:5001/admin/cache/clear \
  -H "X-Admin-Token: seu-token-admin" \
  -H "Content-Type: application/json" \
  -d '{"company_id": "550e8400-e29b-41d4-a716-446655440000"}'
```

**`POST /admin/tenant/isolation-check`**
```bash
curl -X POST http://localhost:5001/admin/tenant/isolation-check \
  -H "X-Admin-Token: seu-token-admin" \
  -H "Content-Type: application/json" \
  -d '{"company_id": "550e8400-e29b-41d4-a716-446655440000"}'
```

---

## 4️⃣ Checklist de Segurança

### ✅ Implementado

- [x] Company ID obrigatório em requisições
- [x] Validação UUID antes de processar
- [x] Middleware de validação em `@app.before_request`
- [x] Cache isolado por empresa
- [x] Todas as queries filtram por company_id
- [x] Logs incluem company_id para auditoria
- [x] Endpoints admin protegidos por token
- [x] Testes de isolamento multi-tenant

### 📋 Em Banco de Dados

**Tabelas com isolamento:**

```sql
-- Todas essas tabelas têm company_id:
- ai_learned_concepts (company_id)
- ai_knowledge_base (company_id)
- ai_word_meanings (company_id)
- ai_conversation_suggestions (company_id)
- ai_conversation_messages (company_id)
- companies (id primária)
```

---

## 5️⃣ Testes de Isolamento

### Executar Testes

```bash
cd ai-service
python test-multi-tenant-isolation.py
```

### Testes Implementados

1. **Company ID Validation**
   - Rejeita requisição sem company_id
   - Rejeita company_id inválido
   - Aceita UUID válido

2. **Data Isolation**
   - Empresa A não vê dados de Empresa B
   - Conceitos/conhecimento isolados

3. **Cache Isolation**
   - Cache separado por empresa
   - Limpeza de cache não afeta outra empresa

4. **Backend Isolation**
   - Routes no backend validam company_id
   - Endpoints requerem filtro por empresa

5. **Learning Data Isolation**
   - Conceitos aprendidos isolados
   - Base de conhecimento isolada

6. **Isolation Check Endpoint**
   - Verifica isolamento em tempo real
   - Retorna estatísticas por empresa

---

## 6️⃣ Variáveis de Ambiente

```bash
# .env

# Token admin para endpoints protegidos
ADMIN_CACHE_TOKEN=seu-token-super-secreto-aqui

# Cache TTL (em segundos)
CACHE_TTL=3600  # 1 hora

# Deve sempre ser configurado:
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma2:2b
DATABASE_URL=postgresql://user:pass@host/agenda
```

---

## 7️⃣ Logs de Auditoria

### Exemplo de Logs Isolados

```
[TENANT:550e8400-e29b-41d4-a716-446655440000] Cognitive request: message="Gostaria de agendar..."
[CACHE] Set: 550e8400-e29b-41d4-a716-446655440000:word_meanings
[CACHE] Hit: 550e8400-e29b-41d4-a716-446655440000:word_meanings
[SECURITY] Request to /cognitive-response missing company_id from 192.168.1.100
[ADMIN] Cache cleared for company 550e8400-e29b-41d4-a716-446655440000
```

---

## 8️⃣ Monitoramento em Produção

### Métricas de Segurança

```bash
# Verificar requisições sem company_id
grep "missing company_id" /var/log/cognitive-engine.log

# Verificar UUIDs inválidos
grep "Invalid company_id\|inválido" /var/log/cognitive-engine.log

# Verificar acessos admin
grep "\[ADMIN\]" /var/log/cognitive-engine.log

# Tamanho do cache
curl http://localhost:5001/health | jq .cache_size
```

---

## 9️⃣ Recomendações para Produção

### Segurança

1. **Rate Limiting por Empresa**
   ```python
   # Implementar para evitar DoS
   from flask_limiter import Limiter
   limiter = Limiter(app, key_func=lambda: request.json.get('company_id'))
   
   @app.route('/cognitive-response')
   @limiter.limit("100 per hour")
   def cognitive_response():
       # ...
   ```

2. **Criptografia de Dados Sensíveis**
   - Cache em memória (atual) é seguro em dev
   - Em produção com múltiplas instâncias, usar Redis com criptografia

3. **Token Admin Seguro**
   ```bash
   # NÃO colocar em .env!
   # Usar: AWS Secrets Manager, HashiCorp Vault, etc.
   export ADMIN_CACHE_TOKEN=$(aws secretsmanager get-secret-value --secret-id cognitive-admin-token)
   ```

4. **Auditoria Centralizada**
   - Enviar logs para ELK Stack, CloudWatch, Datadog
   - Configurar alertas para tentativas de acesso não autorizado

### Operacional

1. **Backup Isolado por Tenant**
   - Cada empresa em schema/database separado (opcional)
   - Ou tags bem definidas no backup para restauração seletiva

2. **Monitoramento por Empresa**
   - Dashboard mostrando uso de CPU/RAM por empresa
   - Alertas se uma empresa usar muitos recursos

3. **Compliance**
   - LGPD: Direito ao esquecimento por empresa
   - GDPR: Exportação de dados por empresa
   - SOC 2: Auditoria de acesso por empresa

---

## 🔟 Cenários de Teste

### Teste 1: Vazamento de Dados

```bash
# Company A cria um conceito
curl -X POST http://localhost:3000/api/ai/learning/teach \
  -H "Authorization: Bearer token-A" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "company-uuid-a",
    "original_query": "Conceito secreto da Empresa A",
    "explanation": "Informação confidencial"
  }'

# Company B tenta acessar
curl -X GET "http://localhost:3000/api/ai/learning/concepts?company_id=company-uuid-a" \
  -H "Authorization: Bearer token-B"

# ✅ ESPERADO: 403 Forbidden (não pertence a Company B)
# ❌ ERRO: 200 OK com dados de Company A (VAZAMENTO!)
```

### Teste 2: Cache Poisoning

```bash
# Se cache não for isolado, fazer requisição com Company A
# pode afetar resposta de Company B

# Company A
POST /cognitive-response
{"company_id": "A", "incoming_message": "..."}
# Response escondida no cache

# Company B
POST /cognitive-response  
{"company_id": "B", "incoming_message": "..."}
# Recebe response em cache de Company A (ERRO!)

# ✅ ESPERADO: Respostas diferentes (caches separados)
# ❌ ERRO: Mesma resposta (cache compartilhado)
```

### Teste 3: SQL Injection Tenant

```bash
# Tentar bypass do filtro company_id com SQL injection
curl -X POST http://localhost:5001/cognitive-response \
  -d '{
    "company_id": "550e8400-e29b-41d4-a716-446655440000 OR 1=1",
    "incoming_message": "..."
  }'

# ✅ ESPERADO: UUID validation falha, requisição rejeitada (400)
# ❌ ERRO: Query executada sem filtro adequado (VAZAMENTO!)
```

---

## 📞 Contato e Suporte

Para questões de segurança:
- Email: security@agenda-sys.com
- Responsável: CTO / Chief Information Security Officer

---

## 📝 Histórico de Versões

| Versão | Data | Alterações |
|--------|------|-----------|
| 1.0 | Jan 2026 | Implementação inicial de isolamento multi-tenant |
| | | Cache isolado por company_id |
| | | Middleware de validação UUID |
| | | Endpoints admin protegidos |
| | | Testes de isolamento |

---

**IMPORTANTE**: Este documento deve ser revisado com a equipe de segurança antes de cada deploy para produção.
