import os
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from app.main import app
from reggenai.db import init_db, persist_proposal, get_patches_by_doc, get_policy


def test_apply_patch_updates_policy(tmp_path, monkeypatch):
    db_file = tmp_path / 'reg_apply.db'
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_file}')
    init_db()

    # Create a proposal (persist directly)
    patch = {
        'patch_id': 'apply-123',
        'doc_id': 'doc-x',
        'clause_id': 'cl-1',
        'agent': 'tester',
        'target': 'policy',
        'field': 'policy_text',
        'op': 'replace',
        'value': [{'policy_id': 'cyber-v4', 'policy_text': 'Updated policy with biometric requirement'}],
        'proposed_text': 'Updated policy with biometric requirement',
        'confidence': 0.9,
        'round': 0,
    }
    persist_proposal(patch)

    client = TestClient(app)
    r = client.post('/patches/apply-123/apply', data={'reviewer_id': 'user-amy', 'human_override': 'false'})
    assert r.status_code == 200
    res = r.json()
    assert res['status'] == 'applied'
    assert res['policy_id'] == 'cyber-v4'

    # Verify policy updated
    pol = get_policy('cyber-v4')
    assert pol is not None
    assert 'biometric' in pol['policy_text'].lower() or 'biometric' in pol['policy_text']

    # Verify patch status updated
    patches = get_patches_by_doc('doc-x')
    applied = next((p for p in patches if p.get('patch_id') == 'apply-123'), None)
    assert applied is not None
    assert applied['status'] == 'applied'
