"""
Quick Start Script for Regulatory Sentinel
"""
import os
import sys
import warnings

# Suppress deprecation warning from google.generativeai (package still works;
# migrate to google.genai when ready)
warnings.filterwarnings(
    "ignore",
    category=DeprecationWarning,
    module="google.generativeai",
)
warnings.filterwarnings(
    "ignore",
    message=".*google.generativeai.*",
    category=DeprecationWarning,
)

# Add project root to path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

def main():
    print("=" * 60)
    print("  REGULATORY SENTINEL - Quick Start")
    print("=" * 60)
    
    # Initialize database
    print("\n1. Initializing database...")
    from src.database.schema import init_db, get_policy_count
    init_db()
    policy_count = get_policy_count()
    print(f"   Database ready. Policies: {policy_count}")
    
    # Check if we need to generate policies
    if policy_count < 1000:
        print("\n2. Generating policies (this may take a moment)...")
        from src.agents.policy_generator import PolicyGeneratorAgent
        generator = PolicyGeneratorAgent()
        result = generator.run(target_count=1000)
        print(f"   Generated {result['record_count']} policies")
    else:
        print(f"\n2. Policy database ready ({policy_count} policies)")
    
    # Start API server
    print("\n3. Starting API server...")
    print("   Dashboard: http://localhost:8000/dashboard")
    print("   API Docs:  http://localhost:8000/docs")
    print("=" * 60)
    
    import uvicorn
    uvicorn.run(
        "src.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False
    )

if __name__ == "__main__":
    main()
