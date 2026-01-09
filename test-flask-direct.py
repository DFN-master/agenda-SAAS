#!/usr/bin/env python
"""Test cognitive engine Flask app directly"""
import os
import sys
import json

os.chdir('d:\\Agenda\\agenda-SAAS\\ai-service')
sys.path.insert(0, 'd:\\Agenda\\agenda-SAAS\\ai-service')

# Set the environment variable for the test
os.environ['DATABASE_URL'] = 'postgresql://agenda_user:agenda_pass@localhost:5432/agenda_db'

try:
    from cognitive_engine import app
    print("✓ Flask app created successfully")
    
    # Create a test client
    client = app.test_client()
    print("✓ Test client created")
    
    # Test the /health endpoint first
    print("\nTesting /health endpoint...")
    response = client.get('/health')
    print(f"Status: {response.status_code}")
    print(f"Response: {response.get_json()}")
    
    # Test the main endpoint
    print("\nTesting /cognitive-response endpoint...")
    test_payload = {
        'incoming_message': 'Quais são os planos disponíveis?',
        'context_summary': 'Histórico vazio',
        'intent': 'preço',
        'company_id': '99999999-9999-9999-9999-999999999999'
    }
    
    response = client.post(
        '/cognitive-response',
        data=json.dumps(test_payload),
        content_type='application/json'
    )
    
    print(f"Status: {response.status_code}")
    data = response.get_json()
    if data:
        print(f"Response keys: {list(data.keys())}")
        print(f"Source: {data.get('source')}")
        print(f"Confidence: {data.get('confidence')}")
        print(f"Needs training: {data.get('needs_training')}")
        print(f"Response preview: {data.get('suggested_response', '')[:80]}...")
    else:
        print(f"Response (raw): {response.data}")
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
