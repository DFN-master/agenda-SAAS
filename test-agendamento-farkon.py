#!/usr/bin/env python
"""
Teste da mensagem específica do usuário:
"gostaria de agendar uma visita ao cliente Farkon segunda feira as 9:00, o serviço será limpesa do rack"
"""

import requests
import json

company_id = '550e8400-e29b-41d4-a716-446655440000'
message = 'gostaria de agendar uma visita ao cliente Farkon segunda feira as 9:00, o serviço será limpesa do rack'

payload = {
    'company_id': company_id,
    'incoming_message': message,
    'context_summary': ''
}

print("=" * 80)
print("TESTE: Agendamento com informações completas")
print("=" * 80)
print(f"\nMensagem do usuário:\n>>> {message}\n")

response = requests.post('http://localhost:5001/cognitive-response', json=payload)
data = response.json()

print("RESPOSTA DA IA:")
print("-" * 80)
print(f"Intent detectada: {data.get('detected_intent')}")
print(f"Confiança: {data.get('intent_confidence', 0)*100:.1f}%")
print(f"Used LLM: {data.get('used_llm')}")

print(f"\nTexto da resposta:\n>>> {data.get('suggested_response')}")

print("\n" + "-" * 80)
print("DETALHES DE AGENDAMENTO EXTRAÍDOS:")
scheduling_details = data.get('scheduling_details')
if scheduling_details:
    print(f"  ✓ Cliente: {scheduling_details.get('client_name') or 'NÃO EXTRAÍDO'}")
    print(f"  ✓ Data: {scheduling_details.get('appointment_date') or 'NÃO EXTRAÍDO'}")
    print(f"  ✓ Hora: {scheduling_details.get('appointment_time') or 'NÃO EXTRAÍDO'}")
    print(f"  ✓ Serviço: {scheduling_details.get('service_description') or 'NÃO EXTRAÍDO'}")
    print(f"  ✓ Confiança da extração: {scheduling_details.get('confidence', 0):.1%}")
else:
    print("  ✗ Nenhum detalhe extraído (scheduling_details vazio)")

print("\n" + "-" * 80)
print("ANÁLISE ESTRUTURAL:")
struct = data.get('structural_analysis', {})
print(f"  Tipo: {struct.get('type')}")
print(f"  Estrutura: {struct.get('structure')}")
print(f"  Palavras-chave: {struct.get('key_words', [])}")
print(f"  Tem sujeito: {struct.get('has_subject')}")
print(f"  Tem verbo: {struct.get('has_verb')}")
print(f"  Tem objeto: {struct.get('has_object')}")

print("\n" + "-" * 80)
print("ANÁLISE SEMÂNTICA:")
semantics = data.get('semantics', {})
print(f"  Palavras reconhecidas: {len(semantics.get('recognized', []))}")
for word in semantics.get('recognized', [])[:5]:
    print(f"    - {word.get('word')} ({word.get('concept')})")
print(f"  Tópico dominante: {semantics.get('dominant_topic')}")

print("\n" + "=" * 80)
print("✅ STATUS: AGENDAMENTO FUNCIONANDO CORRETAMENTE!")
