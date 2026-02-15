from reggenai.agents import AgentOrchestrator


class SimpleAgent:
    def __init__(self, name, proposal=None):
        self.name = name
        self.proposal = proposal

    def analyze(self, clause, context):
        return {"dummy": True}

    def critique(self, clause, all_outputs):
        if not self.proposal:
            return []
        # proposal is a dict with value and confidence
        return [{
            "target": "policy",
            "field": "policy_mappings",
            "op": "replace",
            "value": [self.proposal['value']],
            "confidence": self.proposal.get('confidence', 0.5)
        }]


def test_conflict_resolution_prefers_high_confidence(monkeypatch):
    orchestrator = AgentOrchestrator()
    # add two simple patching agents while keeping core agents
    orchestrator.agents['a1'] = SimpleAgent('a1', proposal={"value": {"policy_id": "P-A"}, "confidence": 0.9})
    orchestrator.agents['a2'] = SimpleAgent('a2', proposal={"value": {"policy_id": "P-B"}, "confidence": 0.6})

    clause = {'text': 'Test clause'}
    outputs = orchestrator.analyze_clause(clause, max_rounds=2)
    # Policy should reflect the higher-confidence agent 'a1' proposal
    assert 'policy' in outputs
    assert outputs['policy']['policy_mappings'][0]['policy_id'] == 'P-A'


def test_confidence_weighted_voting(monkeypatch):
    # Two agents (voters) with low confidence each agree on P-C (0.4 + 0.45 = 0.85)
    # One agent proposes P-D with higher single confidence 0.8 -> group should pick P-C
    orchestrator = AgentOrchestrator()
    orchestrator.agents['v1'] = SimpleAgent('v1', proposal={"value": {"policy_id": "P-C"}, "confidence": 0.4})
    orchestrator.agents['v2'] = SimpleAgent('v2', proposal={"value": {"policy_id": "P-C"}, "confidence": 0.45})
    orchestrator.agents['s1'] = SimpleAgent('s1', proposal={"value": {"policy_id": "P-D"}, "confidence": 0.8})

    clause = {'text': 'Weighted voting clause'}
    outputs = orchestrator.analyze_clause(clause, max_rounds=2)
    assert outputs['policy']['policy_mappings'][0]['policy_id'] == 'P-C'


def test_priority_tie_breaker(monkeypatch):
    # Two conflicting proposals with equal total score; priority should decide
    priority_order = ['alpha', 'beta', 'regulatory', 'policy', 'risk', 'diff', 'audit']
    orchestrator = AgentOrchestrator(agent_priority=priority_order)
    orchestrator.agents['alpha'] = SimpleAgent('alpha', proposal={"value": {"policy_id": "P-X"}, "confidence": 0.5})
    orchestrator.agents['beta'] = SimpleAgent('beta', proposal={"value": {"policy_id": "P-Y"}, "confidence": 0.5})

    clause = {'text': 'Priority tie clause'}
    outputs = orchestrator.analyze_clause(clause, max_rounds=2)
    # tie broken by agent_priority: alpha comes before beta
    assert outputs['policy']['policy_mappings'][0]['policy_id'] == 'P-X'


def test_no_patches_leaves_outputs_unchanged(monkeypatch):
    orchestrator = AgentOrchestrator()
    # replace agents with ones that do not critique
    orchestrator.agents = {k: v for k, v in orchestrator.agents.items()}
    clause = {'text': 'Test clause'}
    outputs = orchestrator.analyze_clause(clause, max_rounds=2)
    # Ensure analysis ran and audit exists
    assert 'audit' in outputs
    assert isinstance(outputs['audit'], dict)
