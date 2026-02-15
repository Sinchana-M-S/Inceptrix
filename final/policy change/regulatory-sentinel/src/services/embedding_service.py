"""
Embedding service for generating text embeddings
Uses Google Generative AI embeddings
"""
import sys
from pathlib import Path
from typing import List, Optional
import hashlib

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from config import GOOGLE_API_KEY, EMBEDDING_MODEL

# Try to import google.generativeai, fall back to mock if not available
try:
    import google.generativeai as genai
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


class EmbeddingService:
    """Service for generating text embeddings"""
    
    def __init__(self):
        self.model = EMBEDDING_MODEL
        self.use_mock = not GENAI_AVAILABLE or not GOOGLE_API_KEY
        if self.use_mock:
            print("⚠ Using mock embeddings (GOOGLE_API_KEY not configured)")
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        if self.use_mock:
            return self._mock_embedding(text)
        
        try:
            result = genai.embed_content(
                model=self.model,
                content=text,
                task_type="retrieval_document"
            )
            return result['embedding']
        except Exception as e:
            print(f"⚠ Embedding error, using mock: {e}")
            return self._mock_embedding(text)
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        return [self.generate_embedding(text) for text in texts]
    
    def generate_query_embedding(self, query: str) -> List[float]:
        """Generate embedding for a search query"""
        if self.use_mock:
            return self._mock_embedding(query)
        
        try:
            result = genai.embed_content(
                model=self.model,
                content=query,
                task_type="retrieval_query"
            )
            return result['embedding']
        except Exception as e:
            print(f"⚠ Query embedding error, using mock: {e}")
            return self._mock_embedding(query)
    
    def _mock_embedding(self, text: str, dimension: int = 768) -> List[float]:
        """Generate deterministic mock embedding based on text hash"""
        # Use hash to create deterministic but unique embedding
        hash_bytes = hashlib.sha256(text.encode()).digest()
        
        # Convert to floats between -1 and 1
        embedding = []
        for i in range(dimension):
            byte_idx = i % len(hash_bytes)
            val = (hash_bytes[byte_idx] + (i * 17) % 256) / 255.0 * 2 - 1
            embedding.append(val)
        
        # Normalize
        norm = sum(x**2 for x in embedding) ** 0.5
        return [x / norm for x in embedding]


# Singleton instance
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    """Get embedding service singleton"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service


if __name__ == "__main__":
    svc = get_embedding_service()
    emb = svc.generate_embedding("Test policy about AI governance")
    print(f"✓ Embedding generated: {len(emb)} dimensions")
