import os
import json
from reggenai.agents import AgentOrchestrator
from reggenai.audit import read_audit


def test_proposal_and_accept_audit(tmp_path, monkeypatch):
    audit_path = tmp_path / "audit.jsonl"
    monkeypatch.setenv('AUDIT_PATH', str(audit_path))

    # Minimal agents for the flow
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

    entries = read_audit()
    # should include at least one proposal and one accepted
    types = [e.get('type') for e in entries]
    assert 'proposal' in types
    assert 'accepted' in types

    # find accepted entry and verify unified diff and spans
    accepted = next(e for e in entries if e.get('type') == 'accepted')
    assert 'unified_diff' in accepted
    assert isinstance(accepted.get('span_highlights'), list)
    assert any('24 months' in (s.get('new') or '') for s in accepted.get('span_highlights')) or '24 months' in accepted.get('unified_diff')
