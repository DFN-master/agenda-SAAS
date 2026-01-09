#!/usr/bin/env python
"""Start cognitive engine directly"""
import subprocess
import sys
import time

# Start the Flask app
proc = subprocess.Popen([sys.executable, 'cognitive_engine.py'], 
                       stdout=open('direct-out.log', 'w'),
                       stderr=open('direct-err.log', 'w'))

print(f"Started Flask app with PID {proc.pid}")
print("Testing endpoint...")
time.sleep(3)

import requests
try:
    r = requests.post('http://localhost:5001/test-endpoint', json={}, timeout=5)
    print(f"test-endpoint: {r.status_code}")
except Exception as e:
    print(f"Error: {e}")

try:
    r = requests.get('http://localhost:5001/health', timeout=5)
    print(f"health: {r.status_code}")
except Exception as e:
    print(f"Error: {e}")

# Wait for app to finish
proc.wait()
