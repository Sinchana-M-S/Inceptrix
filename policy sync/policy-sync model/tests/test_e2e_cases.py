from reggenai.diffgen import generate_diff


def test_specific_threshold_change():
    clause = (
        "Article 42: Any AI system used for credit scoring must maintain a transparency log of at least 24 months of historical data, up from the previous requirement of 12 months."
    )
    policy = (
        "Risk Control #804: Data Retention Policy. Credit risk models shall archive input variables and decision logs for a period of 1 year to ensure auditability."
    )

    # LLM is not needed for heuristic response; pass a dummy object with generate()
    class DummyLLM:
        def generate(self, prompt, max_tokens=512):
            return "{}"

    diff = generate_diff(clause, policy, DummyLLM())
    assert diff['type'] == 'MODIFY'
    assert '24 months' in diff['proposed_policy_text']
    assert diff['confidence'] >= 0.9


def test_ambiguous_clause_biometric_recommendation():
    clause = (
        "Financial entities shall implement a multi-factor authentication (MFA) mechanism for all remote network access that includes at least one non-replicable biometric element."
    )
    policy = (
        "Cybersecurity Standard v4: Remote access requires Strong Authentication. This is currently satisfied by a password plus a time-based one-time password (TOTP) via a mobile app."
    )

    class DummyLLM:
        def generate(self, prompt, max_tokens=512):
            return "{}"

    diff = generate_diff(clause, policy, DummyLLM())
    assert diff['type'] == 'MODIFY'
    assert 'biometric' in diff['proposed_policy_text'].lower()
    assert any(x in diff['proposed_policy_text'].lower() for x in ['faceid', 'fingerprint', 'biometric'])
    assert diff['confidence'] >= 0.8