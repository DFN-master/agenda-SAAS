#!/usr/bin/env python
import os
import sys

print(f"Python version: {sys.version}")
print(f"CWD: {os.getcwd()}")
print(f"DATABASE_URL: {os.getenv('DATABASE_URL', 'NOT SET')}")

try:
    import psycopg2
    print("✓ psycopg2 imported")
except ImportError as e:
    print(f"✗ psycopg2 import failed: {e}")

try:
    from flask import Flask, request, jsonify
    print("✓ Flask imported")
except ImportError as e:
    print(f"✗ Flask import failed: {e}")

print("\nAttempting to import cognitive_engine...")
try:
    os.chdir('d:\\Agenda\\agenda-SAAS\\ai-service')
    sys.path.insert(0, 'd:\\Agenda\\agenda-SAAS\\ai-service')
    import cognitive_engine
    print("✓ cognitive_engine imported successfully")
    print(f"  - Flask app: {cognitive_engine.app}")
except Exception as e:
    print(f"✗ cognitive_engine import failed: {e}")
    import traceback
    traceback.print_exc()
