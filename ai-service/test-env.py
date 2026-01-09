#!/usr/bin/env python
import os
import sys

cwd = os.getcwd()
print(f"Current working directory: {cwd}")
print(f"DATABASE_URL from env: {os.getenv('DATABASE_URL', 'NOT SET')}")

# Try to load from .env file manually
try:
    from dotenv import load_dotenv
    load_dotenv('.env')
    print(f"DATABASE_URL after load_dotenv: {os.getenv('DATABASE_URL', 'NOT SET')}")
except ImportError:
    print("python-dotenv not installed, trying manual load...")
    if os.path.exists('.env'):
        with open('.env') as f:
            for line in f:
                if line.startswith('DATABASE_URL'):
                    key, value = line.split('=', 1)
                    os.environ[key] = value.strip()
        print(f"DATABASE_URL after manual load: {os.getenv('DATABASE_URL', 'NOT SET')}")
