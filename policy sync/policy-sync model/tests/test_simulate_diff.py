from pathlib import Path
import sys
sys.path.append(str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from app.main import app
from reggenai.audit import read_audit
import json

client = TestClient(app)


def test_simulate_threshold_change_no_save():
    payload = {
        'doc_id': 'reg-eu-ai-2026',
        'clause_id': 'cl-42',
        'clause_text': 'Article 42: Any AI system used for credit scoring must maintain a transparency log of at least 24 months of historical data, up from the previous requirement of 12 months.',
        'policy_id': 'RC-804',
        'policy_text': 'Risk Control #804: Data Retention Policy. Credit risk models shall archive input variables and decision logs for a period of 1 year to ensure auditability.'
    }
    r = client.post('/simulate/diff', json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data['diff']['type'] == 'MODIFY'
    assert '24 months' in data['diff']['proposed_policy_text']
    assert '24 months' in data['unified_diff'] or any('24 months' in (s.get('new') or '') for s in data['span_highlights'])
    assert data['saved'] is False


def test_simulate_biometric_recommendation_save(monkeypatch, tmp_path):
    # ensure audit path is set to tmp file
    audit_file = tmp_path / 'audit.jsonl'
    monkeypatch.setenv('AUDIT_PATH', str(audit_file))

    payload = {
        'doc_id': 'dor-res-2026',
        'clause_id': 'cl-mfa',
        'clause_text': 'Financial entities shall implement a multi-factor authentication (MFA) mechanism for all remote network access that includes at least one non-replicable biometric element.',
        'policy_id': 'cyber-v4',
        'policy_text': 'Cybersecurity Standard v4: Remote access requires Strong Authentication. This is currently satisfied by a password plus a time-based one-time password (TOTP) via a mobile app.',
        'save': True
    }
    r = client.post('/simulate/diff', json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data['diff']['type'] == 'MODIFY'
    assert 'biometric' in data['diff']['proposed_policy_text'].lower()
    assert data['saved'] is True

    # read audit file to ensure proposal was recorded
    entries = read_audit(str(audit_file))
    assert any(e.get('type') == 'proposal' and e.get('clause_id') == 'cl-mfa' for e in entries)
