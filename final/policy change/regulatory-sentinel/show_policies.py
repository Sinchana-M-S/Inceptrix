"""Show policies in database"""
import sys
sys.path.insert(0, r'c:\Users\jainj\OneDrive\Desktop\last\regulatory-sentinel')
from src.database.schema import get_session
from src.database.models import Policy

session = get_session()
policies = session.query(Policy).limit(10).all()

print(f'Total policies in database: {session.query(Policy).count()}')
print('='*80)
for p in policies:
    print(f'ID: {p.policy_id}')
    print(f'Name: {p.policy_name}')
    print(f'Domain: {p.domain}')
    print(f'Risk Level: {p.risk_level}')
    text = p.policy_text[:300] if p.policy_text else 'N/A'
    print(f'Text Preview: {text}...')
    print('-'*80)
session.close()
