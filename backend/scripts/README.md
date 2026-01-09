# Scripts de Teste e Utilitários

Esta pasta contém scripts auxiliares para testes, seeds manuais e outras operações que **NÃO** fazem parte do código de produção.

## ⚠️ IMPORTANTE

- **NUNCA** edite arquivos na pasta `dist/`
- Sempre edite os arquivos `.ts` na pasta `src/`
- Após editar, execute `npm run build` para compilar
- Scripts aqui são apenas para desenvolvimento/testes

## Scripts Disponíveis

### seed-plans.js
Popula o banco de dados com 3 planos de exemplo (Básico, Profissional, Empresarial).

**Uso:**
```bash
node scripts/seed-plans.js
```

### seed-test-company.js
Cria uma empresa de teste e associa com o super admin.

**Uso:**
```bash
node scripts/seed-test-company.js
```

## Executando Scripts

Sempre execute a partir do diretório `backend`:

```bash
cd backend
node scripts/nome-do-script.js
```
