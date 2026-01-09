"""Test cognitive engine via HTTP"""
import requests
import json
import time

# Wait for PM2 to fully start
time.sleep(1)

url = "http://localhost:5001/cognitive-response"

payload = {
    "incoming_message": "Qual o preço dos planos?",
    "context_summary": "User asking about pricing",
    "intent": "preço",
    "company_id": "99999999-9999-9999-9999-999999999999"
}

try:
    print("Testing cognitive engine HTTP endpoint...")
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    print("\nSending request...")
    
    response = requests.post(url, json=payload, timeout=10)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    if response.status_code == 200:
        print("\n✅ SUCCESS!")
    else:
        print("\n❌ FAILED")
        print(f"Response text: {response.text}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    print(f"Make sure cognitive engine is running on port 5001")
