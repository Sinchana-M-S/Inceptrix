import json
from typing import Dict, Any
from .llm import LLMWrapper


def _build_diff_prompt(clause_text: str, current_policy: str) -> str:
    prompt = (
        "You are a Diff Generator. Given a regulatory clause and an optional current policy snippet, produce a structured diff object describing the change.\n"
        "Return JSON with keys:\n"
        "- type: one of [ADD, MODIFY, DEPRECATE, UNCHANGED]\n"
        "- proposed_policy_text: the exact policy text to add or modify\n"
        "- rationale: reasoning why change is needed\n"
        "- remediation: { 'legal': text, 'checklist': [items], 'technical': { 'yaml': '...', 'pseudo': '...' } }\n"
        "- confidence: 0-1\n"
        "- human_override: false\n\n"
        f"Clause:\n{clause_text}\n\nCurrent Policy:\n{current_policy}\n\n"
        "Ensure traceability by including the source clause text in the rationale or a reference."
    )
    return prompt


from .utils import parse_duration_to_months, replace_first_duration_with_months, normalize_all_durations_to_months


def generate_diff(clause_text: str, current_policy: str, llm: LLMWrapper) -> Dict[str, Any]:
    # Heuristic 1: Specific duration change (e.g., clause requires 24 months while policy has 1 year)
    clause_months = parse_duration_to_months(clause_text)
    policy_months = parse_duration_to_months(current_policy)
    if clause_months and policy_months and clause_months != policy_months:
        new_policy = replace_first_duration_with_months(current_policy, clause_months)
        return {
            'type': 'MODIFY',
            'proposed_policy_text': new_policy,
            'rationale': f"Regulation requires {clause_months} months; updated from {policy_months} months.",
            'remediation': {
                'legal': f"Align retention period to {clause_months} months to match regulation.",
                'checklist': [f"Update retention from {policy_months} months to {clause_months} months"],
                'technical': {'yaml': None, 'pseudo': f"update retention_days = {clause_months} * 30"}
            },
            'confidence': 0.95,
            'human_override': False,
        }

    # Heuristic 2: Ambiguous clause asking for biometrics vs policy using TOTP/password
    if 'biometric' in (clause_text or '').lower() and any(k in (current_policy or '') for k in ['TOTP', 'time-based one-time', 'password', 'passwords']):
        proposed = (
            f"{current_policy} Update: Implement MFA for remote access to include a non-replicable biometric factor (e.g., FaceID or fingerprint) in addition to or instead of TOTP/passwords."
        )
        return {
            'type': 'MODIFY',
            'proposed_policy_text': proposed,
            'rationale': "Regulation requires a non-replicable biometric element for MFA; TOTP/password alone may be insufficient.",
            'remediation': {
                'legal': "Specify acceptable biometric factors and retention/consent requirements.",
                'checklist': ["Define biometric onboarding and revocation", "Specify storage and security for biometric data"],
                'technical': {'yaml': None, 'pseudo': "implement biometric factor + fallback OTP"}
            },
            'confidence': 0.9,
            'human_override': False,
        }

    # Fallback: ask the LLM but normalize any durations in the proposed text
    prompt = _build_diff_prompt(clause_text, current_policy)
    resp = llm.generate(prompt)
    try:
        parsed = json.loads(resp)
        if 'proposed_policy_text' in parsed and parsed.get('proposed_policy_text'):
            parsed['proposed_policy_text'] = normalize_all_durations_to_months(parsed['proposed_policy_text'])
    except Exception:
        parsed = {
            'type': 'ADD',
            'proposed_policy_text': normalize_all_durations_to_months(clause_text),
            'rationale': None,
            'remediation': {
                'legal': clause_text,
                'checklist': [],
                'technical': {'yaml': None, 'pseudo': None}
            },
            'confidence': 0.5,
            'human_override': False,
        }
    return parsed
