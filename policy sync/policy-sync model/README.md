# Reg-GenAI — Autonomous Regulatory "Sentinel"

A minimal prototype that demonstrates a Retrieval-Augmented Generation (RAG) pipeline for ingesting legal PDF updates and autonomously generating policy diffs and rewritten policy text.

Key features

- PDF ingestion and chunking (pdfplumber)
- Embeddings via SentenceTransformers
- Vector store using FAISS
- LLM wrapper supporting OpenAI or Hugging Face transformer models
- FastAPI server to upload policies, ingest law updates, and produce diffs

Quickstart

1. Copy `.env.example` to `.env` and set your API keys.
2. python -m venv .venv && .\.venv\Scripts\activate
3. pip install -r requirements.txt
4. uvicorn app.main:app --reload --port 8000

Models

- **Recommended (enterprise):** Azure OpenAI (deployment) for generation (GPT-4o family) + OpenAI embeddings (`text-embedding-3-large`) for highest-quality embeddings and enterprise compliance. Use `AZURE_OPENAI_*` variables in `.env` to enable.
- **Local/dev fallback:** `SentenceTransformers` (`all-MiniLM-L6-v2`) for embeddings and a Hugging Face local generative model for LLM tasks.

License: MIT
