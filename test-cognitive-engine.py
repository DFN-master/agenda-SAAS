import requests
import json

payload = {
    'incoming_message': 'Quais são os planos disponíveis?',
    'context_summary': 'Histórico vazio',
    'intent': 'preço',
    'company_id': '99999999-9999-9999-9999-999999999999'
}

try:
    response = requests.post('http://localhost:5001/cognitive-response', json=payload)
    print(f'Status: {response.status_code}')
    if response.status_code == 200:
        data = response.json()
        print(f'\nResponse source: {data.get("source")}')
        print(f'Concepts used: {len(data.get("concepts_used", []))}')
        print(f'Knowledge used: {len(data.get("knowledge_used", []))}')
        print(f'Confidence: {data.get("confidence")}')
        print(f'Needs training: {data.get("needs_training")}')
        
        concepts = data.get("concepts_used", [])
        if concepts:
            print(f'\n✓ Learned concepts found:')
            for c in concepts:
                print(f'  - {c["query"]}')
        
        knowledge = data.get("knowledge_used", [])
        if knowledge:
            print(f'\nKnowledge base entries:')
            for k in knowledge:
                print(f'  - {k["title"]}')
        
        print(f'\nSuggested response preview:')
        print(data.get("suggested_response", "")[:150] + "...")
    else:
        print(f'Error: {response.text}')
except Exception as e:
    print(f'Exception: {e}')
    import traceback
    traceback.print_exc()
