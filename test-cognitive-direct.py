#!/usr/bin/env python
"""Test cognitive engine locally"""
import sys
sys.path.insert(0, 'd:/Agenda/agenda-SAAS/ai-service')

import os
os.chdir('d:/Agenda/agenda-SAAS/ai-service')

try:
    # Import and start the Flask app
    from cognitive_engine import app, cognitive_search, build_cognitive_response
    
    print("✓ Imports successful")
    print("\nTesting cognitive_search directly...")
    
    company_id = '99999999-9999-9999-9999-999999999999'
    query = 'Quais são os planos disponíveis?'
    intent = 'preço'
    
    # Test search
    result = cognitive_search(query, company_id, intent, top_k=3)
    print(f"Search result: {result}")
    
    if result.get('concepts'):
        print(f"\n✓ Found {len(result['concepts'])} learned concepts!")
        for c in result['concepts'][:1]:
            print(f"  - {c.get('original_query')}")
    
    if result.get('knowledge'):
        print(f"✓ Found {len(result['knowledge'])} knowledge entries")
        
    # Test response building
    print("\nTesting response building...")
    response = build_cognitive_response(query, "no context", intent, result)
    print(f"Response preview: {response[:100]}...")
    
    print("\n✓ All direct tests passed!")
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
