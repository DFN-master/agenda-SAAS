import os
import sys
sys.path.insert(0, '/d/Agenda/agenda-SAAS/ai-service')

import psycopg2
from psycopg2.extras import RealDictCursor

database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/agenda')
print(f'Attempting to connect to: {database_url}')

try:
    conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
    cur = conn.cursor()
    
    # Test learned concepts table
    cur.execute('SELECT COUNT(*) as count FROM ai_learned_concepts')
    result = cur.fetchone()
    print(f'✓ Connected! Learned concepts count: {result["count"]}')
    
    # Fetch a sample concept
    cur.execute('''
        SELECT id, original_query, explanation, keywords, approved_count
        FROM ai_learned_concepts 
        WHERE company_id = %s 
        LIMIT 1
    ''', ('99999999-9999-9999-9999-999999999999',))
    
    sample = cur.fetchone()
    if sample:
        print(f'\nSample concept:')
        print(f'  Query: {sample["original_query"]}')
        print(f'  Keywords: {sample.get("keywords", [])}')
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
