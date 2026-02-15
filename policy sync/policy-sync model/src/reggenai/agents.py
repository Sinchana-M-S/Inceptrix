from typing import Dict, Any, List, Optional
from .llm import LLMWrapper


class BaseAgent:
    def __init__(self, name: str, llm: Optional[LLMWrapper] = None):
        self.name = name
        self.llm = llm or LLMWrapper()

    def analyze(self, clause: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def critique(self, clause: Dict[str, Any], all_outputs: Dict[str, Any]) -> Dict[str, Any]:
        """Return suggested edits (partial dict) or an empty dict if no change."""
        return {}


class RegulatoryAnalystAgent(BaseAgent):
    def analyze(self, clause: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        prompt = (
            f"You are a Regulatory Analyst. Extract the core obligation, legal intent, and identify jurisdiction, authority, scope and enforcement risk from the clause. "
            f"Return JSON with keys: obligation, intent, jurisdiction, authority, scope, enforcement_risk, confidence.\n\nClause:\n{clause.get('text')}"
        )
        resp = self.llm.generate(prompt)
        # Expect JSON-like response; try to parse robustly
        try:
            import json

            parsed = json.loads(resp)
        except Exception:
            parsed = {"obligation": clause.get("text"), "intent": None, "jurisdiction": clause.get("jurisdiction"), "authority": clause.get("authority"), "scope": clause.get("scope"), "enforcement_risk": clause.get("enforcement_risk"), "confidence": 0.5}
        return parsed


class PolicyEngineerAgent(BaseAgent):
    def __init__(self, retriever=None, **kwargs):
        super().__init__("PolicyEngineer", kwargs.get('llm'))
        self.retriever = retriever

    def analyze(self, clause: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        # Use retrieval to find candidate internal policies
        candidates = []
        if self.retriever:
            # support both FAISS retriever and ChromaRetriever
            try:
                res = self.retriever.query(clause.get('text', ''), k=5)
                # chroma returns dicts with id/document
                candidates = [{
                    'id': r.get('id'),
                    'document': r.get('document'),
                    'metadata': r.get('metadata')
                } for r in res]
            except Exception:
                # fallback to Faiss-style
                try:
                    emb = context['embeddings_provider'].embed_text(clause.get('text', ''))
                    res = self.retriever.search(emb, k=5)
                    idxs = [r[0] for r in res]
                    if idxs and len(idxs) > 0:
                        texts = self.retriever.get_texts(idxs)
                        candidates = [{'id': str(i), 'document': txt, 'metadata': {}} for i, txt in zip(idxs, texts)]
                except Exception:
                    # retrieval is best-effort
                    pass

        # Use mapping helper to standardize output
        from .mapping import generate_mapping
        mapping = generate_mapping(clause.get('text', ''), candidates, self.llm)
        return mapping


class RiskAssessorAgent(BaseAgent):
    def analyze(self, clause: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        prompt = (
            f"You are a Risk Assessor. Score the non-compliance exposure and severity for this clause on a 0-1 scale and provide a short rationale. Return JSON with keys: severity (0-1), exposure (0-1), rationale, confidence.\n\nClause:\n{clause.get('text')}"
        )
        resp = self.llm.generate(prompt)
        try:
            import json

            parsed = json.loads(resp)
        except Exception:
            parsed = {"severity": 0.5, "exposure": 0.5, "rationale": None, "confidence": 0.4}
        return parsed


class DiffGeneratorAgent(BaseAgent):
    def analyze(self, clause: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        # Use the diffgen helper to create rich diffs + remediation
        from .diffgen import generate_diff
        current = context.get('current_policy_snippet', '') or ''
        diff = generate_diff(clause.get('text', ''), current, self.llm)
        # ensure standard fields
        diff.setdefault('human_override', False)
        diff.setdefault('source_clause', clause.get('text'))
        return diff


class AuditAgent(BaseAgent):
    def analyze(self, clause: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        # Verify traceability and generate explainability info
        combined = context.get('combined_outputs', {})
        prompt = (
            "You are an Audit agent. Verify that each generated change includes source clause, rationale, confidence score, and traceability links. "
            "Return JSON with this schema: {\'ok\': bool, \'issues\': [str], \'notes\': str }"
        )
        resp = self.llm.generate(prompt)
        try:
            import json

            parsed = json.loads(resp)
        except Exception:
            parsed = {"ok": True, "issues": [], "notes": "Manual review recommended"}
        return parsed


# Orchestration helper
class AgentOrchestrator:
    def __init__(self, retriever=None, llm=None, embeddings_provider=None, agent_priority: list | None = None, policies: dict | None = None):
        self.agents = {
            'regulatory': RegulatoryAnalystAgent('Regulatory', llm=llm),
            'policy': PolicyEngineerAgent(retriever=retriever, llm=llm),
            'risk': RiskAssessorAgent('Risk', llm=llm),
            'diff': DiffGeneratorAgent('Diff', llm=llm),
            'audit': AuditAgent('Audit', llm=llm),
        }
        self.retriever = retriever
        self.embeddings_provider = embeddings_provider
        self.policies = policies or {}
        # Priority list for tie-breaking (earlier = higher priority)
        self.agent_priority = agent_priority or ['regulatory', 'policy', 'risk', 'diff', 'audit']
    def analyze_clause(self, clause: Dict[str, Any], max_rounds: int = 2) -> Dict[str, Any]:
        # initial outputs
        outputs = {}
        audit_info = {'proposals': [], 'accepted': []}
        context = {
            'retriever': self.retriever,
            'embeddings_provider': self.embeddings_provider,
            'current_policy_snippet': None,
        }

        # Seed retriever with provided policies (one-time). Supports both Chroma and Faiss style APIs.
        if self.retriever and self.policies and not getattr(self, '_policies_seeded', False):
            ids = []
            texts = []
            metas = []
            for pid, p in self.policies.items():
                ids.append(str(pid))
                # Handle both dict and string policies
                if isinstance(p, str):
                    texts.append(p)
                    metas.append({})
                else:
                    texts.append(p.get('text') or p.get('snippet') or p.get('content', ''))
                    metas.append(p.get('meta', {}))
            try:
                if hasattr(self.retriever, 'add_documents'):
                    # chroma-like
                    self.retriever.add_documents(ids, texts, metadatas=metas)
                elif hasattr(self.retriever, 'add'):
                    # faiss-like
                    embs = self.embeddings_provider.embed_texts(texts)
                    self.retriever.add(embs, texts)
            except Exception:
                # seeding is best-effort; failure is non-fatal
                pass
            self._policies_seeded = True

        # Run core analyses
        outputs['regulatory'] = self.agents['regulatory'].analyze(clause, context)
        # policy engineer should try to retrieve relevant policy snippets
        outputs['policy'] = self.agents['policy'].analyze(clause, {**context, 'embeddings_provider': self.embeddings_provider})
        # pick top candidate snippet for diff
        if outputs['policy'].get('policy_mappings'):
            outputs['current_policy_snippet'] = outputs['policy']['policy_mappings'][0].get('excerpt')
            context['current_policy_snippet'] = outputs['current_policy_snippet']
        outputs['risk'] = self.agents['risk'].analyze(clause, context)
        outputs['diff'] = self.agents['diff'].analyze(clause, {**context, 'current_policy_snippet': context.get('current_policy_snippet')})

        # cross-critique rounds: agents propose structured patches and orchestrator resolves conflicts
        def _apply_patch(target_outputs, patch):
            """Apply a single patch. Returns True if it changed target_outputs."""
            target = patch.get('target')
            field = patch.get('field')
            op = patch.get('op', 'replace')
            value = patch.get('value')
            if target not in target_outputs:
                return False
            if field is None:
                # replace entire target output
                if target_outputs[target] != value:
                    target_outputs[target] = value
                    return True
                return False
            # operate on nested field
            cur = target_outputs[target]
            if isinstance(cur, dict):
                if op == 'replace':
                    if cur.get(field) != value:
                        cur[field] = value
                        return True
                    return False
                elif op == 'merge' and isinstance(value, dict):
                    # shallow merge
                    changed = False
                    for k, v in value.items():
                        if cur.get(field, {}).get(k) != v:
                            if field not in cur or not isinstance(cur[field], dict):
                                cur[field] = {}
                            cur[field][k] = v
                            changed = True
                    return changed
            return False

        for r in range(max_rounds):
            revised = False
            # Collect patches from all agents
            all_outputs_snapshot = {k: v for k, v in outputs.items()}
            all_patches = []
            for name, agent in self.agents.items():
                try:
                    patches = agent.critique(clause, all_outputs_snapshot) if hasattr(agent, 'critique') else []
                except Exception:
                    patches = []
                if not patches:
                    continue
                # normalize to list
                if isinstance(patches, dict):
                    patches = [patches]
                for p in patches:
                    p['agent'] = name
                    # ensure confidence
                    p.setdefault('confidence', 0.5)
                    # ensure patch id & timestamp & round
                    import uuid, datetime
                    p.setdefault('patch_id', str(uuid.uuid4()))
                    p.setdefault('timestamp', datetime.datetime.utcnow().isoformat() + 'Z')
                    p.setdefault('round', r)
                    all_patches.append(p)
                    audit_info['proposals'].append(p)
                    # Audit log the proposal
                    try:
                        from .audit import append_audit
                        append_audit({
                            'doc_id': clause.get('doc_id'),
                            'clause_id': clause.get('clause_id'),
                            'type': 'proposal',
                            'patch': p,
                            'agent': name,
                            'timestamp': p.get('timestamp'),
                            'round': r,
                        })
                    except Exception:
                        pass

            if not all_patches:
                break

            # Group patches by (target, field)
            groups = {}
            for p in all_patches:
                key = (p.get('target'), p.get('field'))
                groups.setdefault(key, []).append(p)

            # Resolve each group by confidence-weighted voting and agent-priority tie-breaker
            chosen_patches = []
            for key, patches in groups.items():
                target, field = key
                # Aggregate by serialized value
                from collections import defaultdict
                import json as _json

                agg = defaultdict(lambda: {'score': 0.0, 'patches': []})
                for p in patches:
                    val_key = _json.dumps(p.get('value'), sort_keys=True, default=str)
                    agg[val_key]['score'] += float(p.get('confidence', 0))
                    agg[val_key]['patches'].append(p)

                # pick highest score
                best_val_key = max(agg.items(), key=lambda kv: kv[1]['score'])[0]
                candidates = agg[best_val_key]['patches']

                # tie-breaker by agent_priority: find candidate with agent highest in priority
                def agent_rank(patch):
                    try:
                        return self.agent_priority.index(patch.get('agent'))
                    except ValueError:
                        return len(self.agent_priority)

                candidates_sorted = sorted(candidates, key=lambda x: ( -float(x.get('confidence',0)), agent_rank(x) ))
                chosen = candidates_sorted[0]
                chosen_patches.append(chosen)

                # Capture before state for audit
                import copy, json, datetime
                before = copy.deepcopy(outputs.get(target))
                applied = _apply_patch(outputs, chosen)
                after = copy.deepcopy(outputs.get(target))

                if applied:
                    revised = True
                    # compute diffs and highlights
                    try:
                        from .utils import generate_unified_diff, compute_span_highlights
                        old_text = json.dumps(before, ensure_ascii=False, indent=2)
                        new_text = json.dumps(after, ensure_ascii=False, indent=2)
                        unified = generate_unified_diff(old_text, new_text, fromfile='before', tofile='after')
                        spans = compute_span_highlights(old_text, new_text)
                    except Exception:
                        unified = ''
                        spans = []

                    audit_info['accepted'].append({'chosen': chosen, 'before': before, 'after': after, 'unified_diff': unified, 'spans': spans})

                    # Audit accepted patch
                    try:
                        from .audit import append_audit
                        append_audit({
                            'doc_id': clause.get('doc_id'),
                            'clause_id': clause.get('clause_id'),
                            'type': 'accepted',
                            'patch': chosen,
                            'agent': chosen.get('agent'),
                            'timestamp': datetime.datetime.utcnow().isoformat() + 'Z',
                            'before': before,
                            'after': after,
                            'unified_diff': unified,
                            'span_highlights': spans,
                        })
                    except Exception:
                        pass
        outputs['audit'] = audit_info
        return outputs