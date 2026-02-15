import json
import os
from typing import Dict, Any

AUDIT_PATH = os.getenv('AUDIT_PATH', 'data/audit.jsonl')


def append_audit(entry: Dict[str, Any], path: str = None):
    # Determine path: prefer explicit param -> env var -> module default
    if path is None:
        path = os.getenv('AUDIT_PATH', AUDIT_PATH)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    try:
        with open(path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, ensure_ascii=False) + '\n')
    except Exception:
        pass

    # If DB configured, also persist to DB for queryability
    try:
        from . import db
        t = entry.get('type')
        if t == 'proposal':
            # entry expected to contain 'patch'
            p = entry.get('patch', {})
            # augment with doc/clause
            p['doc_id'] = entry.get('doc_id')
            p['clause_id'] = entry.get('clause_id')
            db.persist_proposal(p)
        elif t == 'accepted':
            p = entry.get('patch', {})
            before = entry.get('before')
            after = entry.get('after')
            unified = entry.get('unified_diff')
            spans = entry.get('span_highlights')
            db.persist_acceptance(p, before, after, unified, spans)
        else:
            # fallback: write audit event
            ev = {
                'patch_id': entry.get('patch', {}).get('patch_id') if entry.get('patch') else None,
                'payload': entry,
            }
            # Do not overwrite patch status for applied events (they are handled by DB apply helpers).
            if ev.get('patch_id') and entry.get('type') not in ('applied',):
                db.review_patch(ev.get('patch_id'), 'proposed', entry.get('agent', 'system'))
    except Exception:
        pass


def read_audit(path: str = None):
    if path is None:
        path = AUDIT_PATH
    if not os.path.exists(path):
        return []
    out = []
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                out.append(json.loads(line))
            except Exception:
                continue
    return out