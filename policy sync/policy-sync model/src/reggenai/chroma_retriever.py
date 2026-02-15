from typing import List, Dict, Optional

try:
    import chromadb
    from chromadb.config import Settings
except Exception:
    chromadb = None


class ChromaRetriever:
    """Simple Chroma wrapper for storing texts and retrieving by embedding similarity."""

    def __init__(self, collection_name: str = "policies", persist_directory: Optional[str] = None, embeddings_provider=None):
        if chromadb is None:
            raise RuntimeError("chromadb not installed")
        self.client = chromadb.Client(Settings(chroma_db_impl="duckdb+parquet", persist_directory=persist_directory))
        self.collection = self.client.get_or_create_collection(name=collection_name)
        self.emb = embeddings_provider

    def add_documents(self, ids: List[str], texts: List[str], metadatas: Optional[List[Dict]] = None):
        # Compute embeddings via provided embeddings_provider
        if self.emb is None:
            raise RuntimeError("Embeddings provider required")
        embs = self.emb.embed_texts(texts).tolist()
        self.collection.add(ids=ids, embeddings=embs, metadatas=metadatas or [{} for _ in ids], documents=texts)

    def query(self, query_text: str, k: int = 5) -> List[Dict]:
        # returns list of dicts with id, score, document, metadata
        if self.emb is None:
            raise RuntimeError("Embeddings provider required")
        q_emb = self.emb.embed_text(query_text).tolist()
        res = self.collection.query(query_embeddings=[q_emb], n_results=k, include=['documents', 'metadatas', 'distances'])
        results = []
        # res has keys: ids, documents, distances, metadatas
        for ids, docs, dists, metas in zip(res['ids'], res['documents'], res['distances'], res['metadatas']):
            for i, _id in enumerate(ids):
                results.append({'id': _id, 'document': docs[i], 'metadata': metas[i], 'distance': dists[i]})
        return results

    def get_texts(self, ids: List[str]) -> List[str]:
        # fetch documents by ids
        res = self.collection.get(ids=ids, include=['documents'])
        return res['documents']

    def persist(self):
        self.client.persist()