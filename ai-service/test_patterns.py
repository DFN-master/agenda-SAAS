import re

test_phrases = {
    'Como está?': 'ask_status',
    'Qual é o horário?': 'ask_time',
    'Qual horário?': 'ask_time',
    'Onde fica?': 'ask_location',
    'Qual o preço?': 'ask_pricing',
    'Qual preço?': 'ask_pricing',
    'Como pagar?': 'ask_how_to',
}

patterns = {
    'ask_status': [r'\bcomo\b.+(?:está|tá|passa|vai|bem)'],
    'ask_time': [r'\b(?:qual|quais?).+(?:horário|hora)'],
    'ask_pricing': [r'\b(?:qual|quais?|quanto).+(?:prec|preço)'],
    'ask_location': [r'\bonde\b.+(?:fica|está)'],
    'ask_how_to': [r'\bcomo\b.+(?:fazer|pagar)'],
}

for phrase, expected in test_phrases.items():
    matched = False
    for intent, pattern_list in patterns.items():
        for pattern in pattern_list:
            if re.search(pattern, phrase.lower()):
                result = 'OK' if intent == expected else 'FAIL'
                print(f'{result}: "{phrase}" → {intent}')
                matched = True
                break
        if matched:
            break
    if not matched:
        print(f'NO MATCH: "{phrase}" (expected: {expected})')
