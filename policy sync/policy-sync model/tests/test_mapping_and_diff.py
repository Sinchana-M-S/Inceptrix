from reggenai.pipeline import RegGenPipeline


class DummyLLM:
    def generate(self, prompt: str, max_tokens: int = 512):
        # crude but functional responses
        if 'Policy Mapping' in prompt or 'Policy Mapping assistant' in prompt:
            return '{"policy_mappings": [{"policy_id": "P-100", "excerpt": "Existing policy about assessments", "control_id": "C-100", "control_desc": "Run assessment", "confidence": 0.9}], "tech_points": [{"point": "if model.risk==\"high\": create_assessment()", "type": "pseudo"}], "explanation": "maps to P-100", "confidence": 0.9}'
        if 'Diff Generator' in prompt or 'You are a Diff Generator' in prompt:
            return '{"type": "ADD", "proposed_policy_text": "Providers must perform impact assessments within 30 days.", "rationale": "Law requires impact assessment", "remediation": {"legal": "Add policy statement..", "checklist": ["create assessment", "report results"], "technical": {"yaml": "steps:\n - check risk", "pseudo": "if risk==high: create_assessment()"}}, "confidence": 0.92, "human_override": false}'
        return '{}'


def test_full_mapping_and_diff(monkeypatch, tmp_path):
    p = RegGenPipeline()
    p.regulations['doc-e2e'] = [{
        'clause_id': 'e2e-c1', 'doc_id': 'doc-e2e', 'text': 'Providers must perform impact assessments within 30 days.'
    }]
    # Add a synthetic internal policy and upsert to retriever; pipeline.retriever may be Faiss
    p.policies['internal-1'] = {'text': 'Existing policy about assessments'}

    # Patch LLM
    monkeypatch.setattr(p, 'llm', DummyLLM())

    report = p.process_regulation('doc-e2e')
    assert report['doc_id'] == 'doc-e2e'
    clause_report = report['clauses'][0]['analysis']
    assert 'policy' in clause_report
    assert 'diff' in clause_report
    assert clause_report['diff']['type'] == 'ADD'
    assert clause_report['policy']['policy_mappings'][0]['policy_id'] == 'P-100'