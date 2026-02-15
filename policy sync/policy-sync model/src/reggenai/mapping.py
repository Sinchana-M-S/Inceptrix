import json
from typing import Dict, Any, List
from .llm import LLMWrapper


def _build_mapping_prompt(clause_text: str, policy_candidates: List[Dict[str, Any]]) -> str:
    candidates_str = "\n\n".join([f"- [{c.get('id')}] {c.get('document')[:300]}" for c in policy_candidates])
    prompt = (
        "You are a Policy Mapping assistant. Map the given regulatory clause to internal policies and controls.\n"
        "Return a JSON object with keys:\n"
        "- policy_mappings: array of { policy_id, excerpt, control_id, control_desc, confidence }\n"
        "- tech_points: array of { point: string, type: 'yaml'|'pseudo'|'json' }\n"
        "- explanation: short text\n"
        "- confidence: 0-1\n\n"
        f"Clause:\n{clause_text}\n\n"
        f"Policy candidates:\n{candidates_str}\n\n"
        "Prefer semantic reasoning: use the candidate excerpts to find the closest matching internal policies, and produce concise mappings."
    )
    return prompt


def generate_mapping(clause_text: str, policy_candidates: List[Dict[str, Any]], llm: LLMWrapper) -> Dict[str, Any]:
    prompt = _build_mapping_prompt(clause_text, policy_candidates)
    resp = llm.generate(prompt)
    try:
        parsed = json.loads(resp)
    except Exception:
        # best-effort fallback
        parsed = {
            'policy_mappings': [],
            'tech_points': [],
            'explanation': None,
            'confidence': 0.4,
        }
    return parsed
