from .ingest import extract_text_from_pdf, chunk_text
from .embeddings import EmbeddingsProvider
from .retriever import FaissRetriever
from .llm import LLMWrapper
from .diff import generate_diff
from typing import List, Dict
import numpy as np


class RegGenPipeline:
    def __init__(self, emb_model: str = "all-MiniLM-L6-v2"):
        self.emb = EmbeddingsProvider(emb_model)
        # create a retriever with the embedding dim
        self.retriever = FaissRetriever(dim=self.emb.embed_text("test").shape[0])
        self.llm = LLMWrapper()
        # In-memory stores: policies and ingested regulations (MVP)
        self.policies = {}  # policy_id -> list of chunks/snippets
        self.regulations = {}  # doc_id -> list of clauses

    def ingest_policy_pdf(self, pdf_path: str, policy_id: str = "default") -> Dict:
        text = extract_text_from_pdf(pdf_path)
        chunks = chunk_text(text)
        embeddings = self.emb.embed_texts(chunks)
        self.retriever.add(embeddings, chunks)
        self.policies[policy_id] = chunks
        return {"policy_id": policy_id, "chunks_added": len(chunks)}

    def ingest_regulation(self, file_path: str, doc_id: str = None) -> Dict:
        from .clauses import extract_clauses_from_file
        if doc_id is None:
            doc_id = f"doc-{len(self.regulations)+1}"
        result = extract_clauses_from_file(file_path, doc_id, llm=self.llm)
        self.regulations[doc_id] = result.clauses
        return {"doc_id": doc_id, "clauses_extracted": len(result.clauses)}

    def get_regulation_clauses(self, doc_id: str):
        return self.regulations.get(doc_id, [])

    def process_regulation(self, doc_id: str, max_rounds_per_clause: int = 2) -> Dict:
        """Run the multi-agent pipeline across each clause in the regulation and return a structured report."""
        from .agents import AgentOrchestrator

        clauses = self.get_regulation_clauses(doc_id)
        orchestrator = AgentOrchestrator(retriever=self.retriever, llm=self.llm, embeddings_provider=self.emb, policies=self.policies)
        report = {"doc_id": doc_id, "clauses": []}
        from .audit import append_audit
        for clause in clauses:
            # support both Pydantic Clause objects and plain dicts (tests may supply dicts)
            cdict = clause.dict() if hasattr(clause, 'dict') else clause
            outputs = orchestrator.analyze_clause(cdict, max_rounds=max_rounds_per_clause)
            entry = {"doc_id": doc_id, "clause_id": cdict.get('clause_id'), "timestamp": __import__('time').time(), "analysis": outputs}
            append_audit(entry)
            report['clauses'].append({"clause_id": cdict.get('clause_id'), "clause": cdict, "analysis": outputs})
        return report

    def analyze_law_update(self, law_text: str, top_k: int = 5) -> Dict:
        query_emb = self.emb.embed_text(law_text)
        results = self.retriever.search(query_emb, k=top_k)
        indices = [r[0] for r in results]
        contexts = self.retriever.get_texts(indices)

        prompt = self._build_rewrite_prompt(law_text, contexts)
        rewrite = self.llm.generate(prompt)

        # For demonstration we take the top context as old policy snippet
        old = contexts[0] if contexts else ""
        diff = generate_diff(old, rewrite)
        return {"rewrite": rewrite, "diff": diff, "sources": indices}

    def _build_rewrite_prompt(self, law_text: str, contexts: List[str]) -> str:
        ctx = "\n\n---\n\n".join(contexts)
        prompt = (
            f"You are an expert regulatory-to-implementation assistant.\n"
            f"Law update:\n{law_text}\n\n"
            f"Relevant current policy excerpts:\n{ctx}\n\n"
            "Generate the minimal, precise policy or code changes necessary to satisfy the new law."
            " Include a brief justification and point to the source excerpt." 
        )
        return prompt
