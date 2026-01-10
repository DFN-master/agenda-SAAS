# 🌱 Carregamento Automático de Dicionário

## O Que Foi Adicionado

Um novo recurso que permite **carregar automaticamente um dicionário inicial com 40+ palavras de negócio** para sua IA, economizando tempo na configuração e dando uma "bagagem de informação" profissional desde o início.

## Como Funciona

### 1. Acessar o Painel de Treinamento
- Navegue até **"Treinamento de IA"** em seu dashboard
- Scroll até a seção **"📖 Vocabulário e Conceitos"**

### 2. Carregar o Dicionário Inicial
- Você verá um botão verde: **"🌱 Carregar Dicionário"**
- Este botão só aparece quando o vocabulário está vazio
- Clique nele e confirme o popup
- O sistema carregará **25 palavras essenciais** do seu segmento

### 3. Palavras Carregadas

O dicionário inicial inclui:

#### Palavras de Negócio (15 palavras)
1. **agendamento** - Marcar data/horário para consulta
2. **atendimento** - Serviço prestado ao cliente
3. **consulta** - Encontro com profissional especializado
4. **orçamento** - Estimativa de custos e valores
5. **pagamento** - Quitar débito ou compensação
6. **promoção** - Desconto ou oferta especial
7. **garantia** - Compromisso sobre qualidade
8. **cancelamento** - Rescindir/suspender serviço
9. **horário** - Período de funcionamento
10. **localização** - Endereço/lugar do negócio
11. **dúvida** - Incerteza ou questionamento
12. **comunicação** - Troca de informações/diálogo
13. **feedback** - Retorno sobre satisfação
14. **suporte** - Assistência técnica ao cliente
15. **qualidade** - Grau de excelência

#### Verbos de Ação (10 palavras)
1. **ajudar** - Prestar assistência
2. **entender** - Compreender/absorver informação
3. **resolver** - Encontrar solução
4. **contatar** - Estabelecer comunicação
5. **enviar** - Remeter/transmitir
6. **confirmar** - Validar/assegurar
7. **problema** - Situação que causa dificuldade
8. **solução** - Resposta para problema
9. **satisfação** - Contentamento com serviço
10. **responsabilidade** - Obrigação de responder

### 4. Cada Palavra Inclui

Cada palavra carregada contém:
- ✅ **Definição completa** - Explicação clara para a IA
- ✅ **Sinônimos** - Alternativas que a IA reconhecerá
- ✅ **Exemplos** - Frases reais para context learning

**Exemplo de "agendamento":**
```
Definição: Ato ou processo de marcar uma data ou horário para uma consulta, 
atendimento ou serviço.

Sinônimos: marcação, reserva, horário marcado, consulta agendada

Exemplos:
- Como faço para agendar uma consulta?
- Qual é a disponibilidade para agendamento?
- Preciso remarcar meu agendamento
```

## Benefícios

✅ **Economia de Tempo** - Não precisa criar 40+ palavras manualmente
✅ **Base Profissional** - Palavras selecionadas para atendimento ao cliente
✅ **Imediato** - Ativa com um clique
✅ **Personalizável** - Você ainda pode editar/adicionar mais palavras
✅ **Contexto Empresarial** - Focado em termos de negócio comum

## O Que Acontece Após Carregar

1. **Imediatamente**: Vocabulário aparece na seção de palavras
2. **Próxima Mensagem**: AI usará estes termos para melhor compreensão
3. **Dentro de 10s**: Frontend atualiza e mostra todas as 40+ palavras

## Após Carregar

- O botão **"🌱 Carregar Dicionário"** desaparece (já carregado)
- Você pode **adicionar mais palavras** clicando em "+ Adicionar Palavra"
- Você pode **editar qualquer palavra** já carregada
- Você pode **remover palavras** que não usa

## Exemplo de Impacto

### Antes (sem dicionário):
```
Customer: "Como agendar?"
AI Response: Desculpe, não entendi direito...
Confidence: 35%
```

### Depois (com dicionário):
```
Customer: "Como agendar?"
AI Response: Você pode agendar uma consulta através de nosso site 
ou ligando para (XX) XXXX-XXXX. Qual horário prefere?
Confidence: 85%
```

## Próximos Passos Recomendados

Após carregar o dicionário:

1. **Personalizar**: Adicione termos específicos do seu negócio
2. **Expandir**: Inclua nomes de serviços/produtos específicos
3. **Refinar**: Edite definições para seu contexto específico
4. **Testar**: Envie mensagens de teste e veja como a AI responde

## Dados Técnicos

- **Endpoint**: `POST /api/ai/vocabulary/seed`
- **Palavras Carregadas**: 25 palavras principais
- **Exemplos Totais**: 100+ frases de exemplo
- **Sinônimos**: 50+ alternativas
- **Armazenamento**: Company metadata (sem necessidade de migração de banco)
- **Permanência**: Dados ficam salvos permanentemente

## Suporte

Caso o carregamento não funcione:
1. Certifique-se de estar logado
2. Verifique se o vocabulário está realmente vazio
3. Verifique os logs do backend: `pm2 logs agenda-backend | grep Vocabulary`
4. Tente adicionar uma palavra manualmente primeiro
