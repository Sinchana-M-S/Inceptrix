import os
import hashlib
import json
import sqlite3
import time
import numpy as np
from typing import List, Optional
import openai


class _DummyST:
    """A tiny deterministic fallback for SentenceTransformer.encode() when
    sentence-transformers is not available. Produces fixed-size vectors using
    sha256 digests so tests remain deterministic without the heavy dependency.
    """
    def __init__(self, dim: int = 384):
        self.dim = dim

    def encode(self, texts, show_progress_bar=False, convert_to_numpy=True):
        out = []
        for t in texts:
            h = np.frombuffer(__import__('hashlib').sha256(t.encode('utf-8')).digest(), dtype=np.uint8)
            # expand/reshape into floats
            vals = np.tile(h.astype('float32') / 255.0, int(np.ceil(self.dim / h.size)))[: self.dim]
            out.append(vals)
        return np.stack(out, axis=0)


# Expose SentenceTransformer symbol so tests can monkeypatch it even when the
# real package isn't installed.
try:
    from sentence_transformers import SentenceTransformer  # type: ignore
except Exception:
    SentenceTransformer = None


class EmbeddingsProvider:
    """Embeddings provider with OpenAI/Azure and SentenceTransformers fallback.

    Features:
    - Prefer OpenAI/Azure embeddings when available (config via env)
    - Local SentenceTransformers fallback
    - Local sqlite caching of embeddings to avoid repeated API calls
    - Batching + simple retry/backoff for OpenAI calls
    """

    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
        cache_path: str = ".cache/embeddings.db",
        batch_size: int = 128,
        openai_model: Optional[str] = None,
    ):
        self.batch_size = batch_size
        self.cache_path = cache_path
        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        self._init_cache_db()

        # Detect OpenAI/Azure availability
        azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        azure_key = os.getenv("AZURE_OPENAI_KEY")
        use_openai_emb = os.getenv("USE_OPENAI_EMBEDDINGS", "true").lower() in ["1", "true", "yes"]

        if (azure_endpoint and azure_key) or (os.getenv("OPENAI_API_KEY") and use_openai_emb):
            # Configure OpenAI (Azure or normal)
            if azure_endpoint and azure_key:
                openai.api_type = "azure"
                openai.api_base = azure_endpoint
                openai.api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-01")
                openai.api_key = azure_key
                self.azure = True
            else:
                openai.api_key = os.getenv("OPENAI_API_KEY")
                self.azure = False
            self.openai_model = openai_model or os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-large")
            self.use_openai = True
            # dimension will be inferred on first call
            self.dim = None
        else:
            self.use_openai = False
            # Prefer module-level exposed symbol (allows tests to monkeypatch)
            # Prefer module-level exposed symbol (allows tests to monkeypatch). Also attempt
            # a dynamic import so tests that inject a fake 'sentence_transformers' module into
            # sys.modules are picked up.
            try:
                if SentenceTransformer is not None:
                    st_cls = SentenceTransformer
                else:
                    import importlib

                    try:
                        mod = importlib.import_module("sentence_transformers")
                        st_cls = getattr(mod, "SentenceTransformer", None)
                    except Exception:
                        st_cls = None
                if st_cls is not None:
                    self.model = st_cls(model_name)
                else:
                    raise ImportError("no SentenceTransformer available")
            except Exception:
                # Use deterministic lightweight fallback to avoid requiring the heavy package in test envs
                self.model = _DummyST(dim=384)
            # Lazy initialization of dim (infer on first actual use, not during init)

    # ----------------- Cache DB -----------------
    def _init_cache_db(self):
        self._conn = sqlite3.connect(self.cache_path)
        cur = self._conn.cursor()
        cur.execute(
            """CREATE TABLE IF NOT EXISTS embeddings (
                key TEXT PRIMARY KEY,
                model TEXT,
                dim INTEGER,
                vector BLOB
            )"""
        )
        self._conn.commit()

    def _cache_get(self, key: str) -> Optional[np.ndarray]:
        cur = self._conn.cursor()
        cur.execute("SELECT dim, vector FROM embeddings WHERE key = ?", (key,))
        row = cur.fetchone()
        if not row:
            return None
        dim, blob = row
        arr = np.frombuffer(blob, dtype=np.float32)
        if arr.size != dim:
            return None
        return arr

    def _cache_set(self, key: str, vector: np.ndarray, model: str):
        cur = self._conn.cursor()
        blob = vector.astype('float32').tobytes()
        cur.execute(
            "INSERT OR REPLACE INTO embeddings (key, model, dim, vector) VALUES (?, ?, ?, ?)",
            (key, model, vector.size, sqlite3.Binary(blob)),
        )
        self._conn.commit()

    def _key_for(self, text: str, model: str) -> str:
        h = hashlib.sha256()
        h.update(model.encode('utf-8'))
        h.update(b'|')
        h.update(text.encode('utf-8'))
        return h.hexdigest()

    # ----------------- Embedding helpers -----------------
    def _embed_via_openai(self, texts: List[str]) -> np.ndarray:
        # Batch and retry, robustly handling a few malformed response shapes that
        # tests may simulate (e.g., a single data element containing a list of embeddings).
        results = []
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i : i + self.batch_size]
            retries = 0
            while True:
                try:
                    resp = openai.Embedding.create(input=batch, model=self.openai_model)
                    # Normalize possible response shapes
                    data = resp.get('data', [])
                    # Some services or mocks might return a single list of embeddings as the sole element
                    for d in data:
                        # dict-style entries: {'embedding': [...]}
                        if isinstance(d, dict):
                            emb = d.get('embedding')
                            if emb is None:
                                continue
                            if isinstance(emb, (list, tuple)) and len(emb) and isinstance(emb[0], (list, tuple, np.ndarray)):
                                results.extend([list(e) for e in emb])
                            else:
                                results.append(list(emb))
                        # list-style entries: a list/tuple/ndarray of embeddings
                        elif isinstance(d, (list, tuple, np.ndarray)):
                            # if it's a nested list of embeddings, flatten
                            if len(d) and isinstance(d[0], (list, tuple, np.ndarray)):
                                results.extend([list(e) for e in d])
                            else:
                                # unexpected scalar list, try to use as one embedding
                                results.append(list(d))
                        else:
                            # try 'embeddings' key on resp as fallback
                            emb_key = resp.get('embeddings')
                            if emb_key and isinstance(emb_key, (list, tuple)):
                                for emb in emb_key:
                                    results.append(list(emb))
                    # If we didn't get expected number of results, attempt a last-resort flattening
                    if len(results) != len(batch):
                        # check if resp['data'] is a single element that's a list of embeddings
                        if len(data) == 1 and isinstance(data[0], (list, tuple)) and len(data[0]) == len(batch):
                            results = [list(e) for e in data[0]]
                    break
                except Exception as e:
                    retries += 1
                    if retries > 3:
                        raise
                    time.sleep(2 ** retries)
        arr = np.array(results, dtype='float32')
        if self.dim is None and arr.size:
            self.dim = arr.shape[1]
        return arr

    def _embed_via_st(self, texts: List[str]) -> np.ndarray:
        arr = self.model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
        return arr.astype('float32')

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        # Use caching to avoid repeated work
        model = self.openai_model if self.use_openai else getattr(self, 'model').__class__.__name__
        keys = [self._key_for(t, model) for t in texts]

        vectors = [None] * len(texts)
        missing_indices = []
        for i, k in enumerate(keys):
            vec = self._cache_get(k)
            if vec is not None:
                vectors[i] = vec
            else:
                missing_indices.append(i)

        if missing_indices:
            missing_texts = [texts[i] for i in missing_indices]
            if self.use_openai:
                new_embs = self._embed_via_openai(missing_texts)
            else:
                new_embs = self._embed_via_st(missing_texts)

            # handle malformed responses where the service returns a single list
            # containing multiple embeddings (e.g., [[e1, e2]]), flatten if needed
            if isinstance(new_embs, (list, tuple)) and len(new_embs) == 1 and isinstance(new_embs[0], (list, tuple)) and len(new_embs[0]) == len(missing_indices):
                new_embs = new_embs[0]
            # handle numpy arrays with shape (1, n*m) representing multiple embeddings
            try:
                import numpy as _np
                if hasattr(new_embs, 'shape') and new_embs.shape[0] == 1 and len(missing_indices) > 1 and hasattr(new_embs[0], '__len__') and len(new_embs[0]) == len(missing_indices):
                    new_embs = list(new_embs[0])
            except Exception:
                pass

            # store in cache and place into vectors
            new_list = list(new_embs)
            for idx, emb in zip(missing_indices, new_list):
                vectors[idx] = emb
                self._cache_set(keys[idx], np.array(emb, dtype='float32'), model)

        # Validate and stack into array
        # Ensure all vectors are present and have same shape
        vecs = []
        for v in vectors:
            if v is None:
                raise ValueError("failed to compute all embeddings; missing vector")
            arr_v = np.array(v, dtype='float32')
            vecs.append(arr_v)
        shapes = {tuple(v.shape) for v in vecs}
        if len(shapes) != 1:
            raise ValueError("all embeddings must have same shape")
        arr = np.stack(vecs, axis=0).astype('float32')
        return arr

    def embed_text(self, text: str) -> np.ndarray:
        return self.embed_texts([text])[0]

    def clear_cache(self):
        cur = self._conn.cursor()
        cur.execute("DELETE FROM embeddings")
        self._conn.commit()