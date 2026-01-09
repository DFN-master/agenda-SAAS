import sys
import traceback

try:
    print("Importing cognitive_engine...")
    sys.path.insert(0, '/d/Agenda/agenda-SAAS/ai-service')
    import cognitive_engine
    print("✓ Successfully imported cognitive_engine")
except Exception as e:
    print(f"✗ Import error: {e}")
    traceback.print_exc()
