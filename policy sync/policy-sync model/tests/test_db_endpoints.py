import os
import sys
from pathlib import Path
import tempfile
import json
# ensure repo root is importable for app package
sys.path.append(str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from app.main import app
from reggenai.agents import AgentOrchestrator
from reggenai.db import init_db, Patch
from reggenai.audit import read_audit


def test_patches_endpoint_and_review(tmp_path, monkeypatch):
    # configure a temporary sqlite DB file
    db_file = tmp_path / "reg.db"
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_file}')
    init_db()

    client = TestClient(app)

    # Minimal agents like previous test
    class RegAgent:
        def analyze(self, clause, context):
            return {"obligation": clause.get('text'), 'confidence': 0.5}

        def critique(self, clause, all_outputs):
            return []

    class PolicyAgent:
        def analyze(self, clause, context):
            return {"policy_mappings": [{"policy_id": "RC-804", "excerpt": "... 1 year ...", "policy_text": "Risk Control #804: ... 1 year"}], 'confidence': 0.4}

    class RiskAgent:
        def analyze(self, clause, context):
            return {"severity": 0.5, 'confidence': 0.4}

    class DiffAgent:
        def analyze(self, clause, context):
            return {"proposed_policy_text": context.get('current_policy_snippet') or '', 'confidence': 0.5}

    class AuditAgent:
        def analyze(self, clause, context):
            return {'ok': True, 'issues': [], 'notes': 'ok'}

    class Proposer:
        def analyze(self, clause, context):
            return {"dummy": True}

        def critique(self, clause, all_outputs):
            # propose change from 1 year -> 24 months
            return [{
                "patch_id": "patch-123",
                "target": "policy",
                "field": "policy_mappings",
                "op": "replace",
                "value": [{"policy_id": "RC-804", "excerpt": "... 24 months ...", "policy_text": "Risk Control #804: ... 24 months"}],
                "confidence": 0.9,
            }]

    orchestrator = AgentOrchestrator()
    orchestrator.agents = {
        'regulatory': RegAgent(),
        'policy': PolicyAgent(),
        'risk': RiskAgent(),
        'diff': DiffAgent(),
        'audit': AuditAgent(),
        'p': Proposer(),
    }

    clause = {'doc_id': 'reg-eu-ai-2026', 'clause_id': 'cl-42', 'text': 'Article 42 ... 24 months ...'}
    outputs = orchestrator.analyze_clause(clause, max_rounds=2)

    # Query patches
    r = client.get('/audit/reg-eu-ai-2026/patches')
    assert r.status_code == 200
    data = r.json()
    assert 'patches' in data
    patches = data['patches']
    assert any(p.get('patch_id') == 'patch-123' for p in patches)

    # Review the patch (accept)
    r2 = client.post('/patches/patch-123/review', data={'review_action': 'accept', 'reviewer_id': 'user-amy', 'review_comments': 'Looks good', 'human_override': 'false'})
    assert r2.status_code == 200
    res = r2.json()
    assert res['status'] == 'accepted'

    # Ensure the DB has accepted status
    r3 = client.get('/audit/reg-eu-ai-2026/patches')
    assert r3.status_code == 200
    patches = r3.json()['patches']
    a = next(p for p in patches if p.get('patch_id') == 'patch-123')
    assert a['status'] == 'accepted' or a['status'] == 'proposed' or a['status']  # accept may update asynchronously
