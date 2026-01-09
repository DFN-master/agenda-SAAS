"""Test cognitive engine with detailed error output"""
import requests
import json
import time

time.sleep(1)

url = "http://localhost:5001/cognitive-response"
payload = {
    "incoming_message": "Qual o preço dos planos?",
    "context_summary": "User asking about pricing",
    "intent": "preço",
    "company_id": "99999999-9999-9999-9999-999999999999"
}

try:
    print("Sending request to:", url)
    response = requests.post(url, json=payload, timeout=10)
    
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {response.headers}")
    print(f"Body: {response.text}")
    
    if response.status_code == 200:
        print("\n✅ SUCCESS!")
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    else:
        print("\n❌ Failed with status:", response.status_code)
        
except requests.exceptions.Timeout:
    print("❌ Timeout - cognitive engine not responding")
except requests.exceptions.ConnectionError as e:
    print(f"❌ Connection error: {e}")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
