import numpy as np
from typing import List, Tuple


# Optional FAISS dependency: if unavailable, provide a simple brute-force fallback
try:
    import faiss
    _HAS_FAISS = True
except Exception:
    faiss = None
    _HAS_FAISS = False


class FaissRetriever:
    def __init__(self, dim: int):
        self.dim = dim
        self.texts = []
        if _HAS_FAISS:
            self.index = faiss.IndexFlatL2(dim)
        else:
            self.index = None
            self.vectors = np.zeros((0, dim), dtype='float32')

    def add(self, embeddings: np.ndarray, texts: List[str]):
        assert embeddings.shape[0] == len(texts)
        if _HAS_FAISS:
            self.index.add(np.array(embeddings).astype('float32'))
        else:
            self.vectors = np.vstack([self.vectors, np.array(embeddings).astype('float32')]) if self.vectors.size else np.array(embeddings).astype('float32')
        self.texts.extend(texts)

    def search(self, query_emb: np.ndarray, k: int = 5) -> List[Tuple[int, float]]:
        if _HAS_FAISS:
            query = np.array([query_emb]).astype('float32')
            D, I = self.index.search(query, k)
            results = []
            for idx, dist in zip(I[0], D[0]):
                if idx < len(self.texts):
                    results.append((idx, float(dist)))
            return results
        else:
            if self.vectors.size == 0:
                return []
            # compute L2 distances
            diffs = self.vectors - np.array(query_emb).astype('float32')
            dists = np.sum(diffs * diffs, axis=1)
            idxs = np.argsort(dists)[:k]
            return [(int(i), float(dists[i])) for i in idxs]

    def get_texts(self, indices: List[int]) -> List[str]:
        return [self.texts[i] for i in indices]

