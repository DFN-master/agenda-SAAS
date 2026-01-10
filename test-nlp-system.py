#!/usr/bin/env python3
"""
Test script for the new structural NLP system.
Tests various queries to verify intent detection and cognitive response generation.
"""
import requests
import json

BASE_URL = "http://localhost:5001"
TEST_COMPANY_ID = "123e4567-e89b-12d3-a456-426614174000"

test_cases = [
    {
        "name": "Ask about capabilities",
        "message": "O que vc faz?",
        "expected_intent": "ask_capabilities"
    },
    {
        "name": "Ask about pricing",
        "message": "Qual o preço dos planos?",
        "expected_intent": "ask_pricing"
    },
    {
        "name": "Ask how to schedule",
        "message": "Como agendar um compromisso?",
        "expected_intent": "ask_how_to"
    },
    {
        "name": "Report an issue",
        "message": "Não conseguo agendar. Tenho um problema!",
        "expected_intent": "report_issue"
    },
    {
        "name": "General inquiry",
        "message": "Olá, você consegue me ajudar?",
        "expected_intent": "general_inquiry"
    },
]

print("=" * 80)
print("STRUCTURAL NLP SYSTEM TEST")
print("=" * 80)

for test_case in test_cases:
    print(f"\n{'─' * 80}")
    print(f"Test: {test_case['name']}")
    print(f"Message: \"{test_case['message']}\"")
    print(f"Expected Intent: {test_case['expected_intent']}")
    print(f"{'─' * 80}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/cognitive-response",
            json={
                "incoming_message": test_case["message"],
                "context_summary": "Nenhuma mensagem anterior",
                "company_id": TEST_COMPANY_ID,
                "intent": "geral"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            
            detected_intent = data.get("detected_intent", "unknown")
            intent_confidence = data.get("intent_confidence", 0)
            structural = data.get("structural_analysis", {})
            response_text = data.get("suggested_response", "")
            
            # Check if intent matches expectation
            intent_match = "✓" if detected_intent == test_case["expected_intent"] else "✗"
            
            print(f"\n📊 ANALYSIS RESULTS:")
            print(f"  Detected Intent: {detected_intent} {intent_match}")
            print(f"  Intent Confidence: {intent_confidence:.2%}")
            print(f"  Sentence Structure: {structural.get('structure', 'unknown')}")
            print(f"  Is Question: {structural.get('is_question', False)}")
            print(f"  Interrogatives: {', '.join(structural.get('interrogatives', [])) or 'none'}")
            print(f"  Subjects: {', '.join(structural.get('subjects', [])) or 'none'}")
            print(f"  Verbs: {', '.join(structural.get('verbs', [])) or 'none'}")
            
            print(f"\n📝 GENERATED RESPONSE:")
            for line in response_text.split('\n'):
                if line.strip():
                    print(f"  {line}")
            
            print(f"\n✅ TEST PASSED" if intent_match == "✓" else "\n❌ TEST FAILED - Intent mismatch")
        else:
            print(f"\n❌ ERROR: HTTP {response.status_code}")
            print(f"Response: {response.text}")
    
    except requests.exceptions.RequestException as e:
        print(f"\n❌ CONNECTION ERROR: {e}")
        print("Make sure the cognitive-engine is running (port 5001)")

print(f"\n{'═' * 80}")
print("TEST SUITE COMPLETED")
print(f"{'═' * 80}\n")
