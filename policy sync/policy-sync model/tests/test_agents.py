from reggenai.agents import AgentOrchestrator
from reggenai.pipeline import RegGenPipeline


class DummyLLM:
    def generate(self, prompt: str, max_tokens: int = 512):
        # Very simple JSON-ish responses based on keywords
        if 'Regulatory Analyst' in prompt or 'Regulatory' in prompt:
            return '{"obligation": "perform impact assessment", "intent": "safety", "jurisdiction": "EU", "authority": "EU Parliament", "scope": "High-risk AI", "enforcement_risk": "High", "confidence": 0.9}'
        if 'Policy Engineer' in prompt or 'Policy Engineer' in prompt:
            return '{"policy_mappings": [{"policy_id": "P-001", "excerpt": "current policy about assessments", "control_id": "C-001", "control_desc": "perform assessments"}], "tech_points": ["if model.risk==high: create_assessment()"], "explanation": "maps to P-001", "confidence": 0.85}'
        if 'Risk Assessor' in prompt or 'Risk Assessor' in prompt:
            return '{"severity": 0.8, "exposure": 0.7, "rationale": "high impact to customers", "confidence": 0.85}'
        if 'Diff Generator' in prompt or 'Diff Generator' in prompt:
            return '{"type": "ADD", "proposed_policy_text": "Providers must perform impact assessments within 30 days.", "rationale": "new req", "confidence": 0.9}'
        if 'Audit' in prompt or 'Audit agent' in prompt:
            return '{"ok": true, "issues": [], "notes": "All traceability present."}'
        # default
        return '{}'


def test_agent_orchestration_end_to_end(monkeypatch):
    # Setup pipeline with a short clause
    p = RegGenPipeline()
    p.regulations['doc-test'] = [
        {
            'clause_id': 'doc-test-c1',
            'doc_id': 'doc-test',
            'text': 'Organizations must perform impact assessments for high-risk models within 30 days.',
        }
    ]

    # Patch the pipeline LLM with DummyLLM
    dummy = DummyLLM()
    monkeypatch.setattr(p, 'llm', dummy)

    report = p.process_regulation('doc-test')
    assert report['doc_id'] == 'doc-test'
    assert len(report['clauses']) == 1
    analysis = report['clauses'][0]['analysis']
    assert 'regulatory' in analysis
    assert 'policy' in analysis
    assert 'risk' in analysis
    assert 'diff' in analysis
    assert 'audit' in analysis
    # check some values
    assert analysis['regulatory']['obligation'].startswith('perform impact') or 'impact assessment' in analysis['regulatory']['obligation']
    assert analysis['diff']['type'] == 'ADD'