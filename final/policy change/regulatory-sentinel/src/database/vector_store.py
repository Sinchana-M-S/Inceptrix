"""
ChromaDB Vector Store for RAG operations
"""
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from config import CHROMA_PERSIST_DIR, RAG_TOP_K, SIMILARITY_THRESHOLD


class VectorStore:
    """ChromaDB wrapper for policy and clause embeddings"""
    
    def __init__(self, persist_directory: str = CHROMA_PERSIST_DIR):
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Create collections
        self.policy_collection = self.client.get_or_create_collection(
            name="policies",
            metadata={"description": "Bank policy embeddings"}
        )
        
        self.clause_collection = self.client.get_or_create_collection(
            name="clauses", 
            metadata={"description": "Regulatory clause embeddings"}
        )
    
    def add_policy_embeddings(
        self,
        policy_ids: List[str],
        texts: List[str],
        embeddings: List[List[float]],
        metadatas: Optional[List[Dict[str, Any]]] = None
    ):
        """Add policy embeddings to vector store"""
        self.policy_collection.add(
            ids=policy_ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas or [{}] * len(policy_ids)
        )
        return len(policy_ids)
    
    def add_clause_embeddings(
        self,
        clause_ids: List[str],
        texts: List[str],
        embeddings: List[List[float]],
        metadatas: Optional[List[Dict[str, Any]]] = None
    ):
        """Add clause embeddings to vector store"""
        self.clause_collection.add(
            ids=clause_ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas or [{}] * len(clause_ids)
        )
        return len(clause_ids)
    
    def search_policies(
        self,
        query_embedding: List[float],
        top_k: int = RAG_TOP_K,
        filter_criteria: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar policies given a query embedding"""
        results = self.policy_collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=filter_criteria
        )
        
        # Format results
        matches = []
        if results and results['ids'] and results['ids'][0]:
            for i, policy_id in enumerate(results['ids'][0]):
                score = 1 - results['distances'][0][i] if results['distances'] else 0
                if score >= SIMILARITY_THRESHOLD:
                    matches.append({
                        "policy_id": policy_id,
                        "document": results['documents'][0][i] if results['documents'] else "",
                        "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
                        "similarity_score": score
                    })
        
        return matches
    
    def search_clauses(
        self,
        query_embedding: List[float],
        top_k: int = RAG_TOP_K
    ) -> List[Dict[str, Any]]:
        """Search for similar clauses given a query embedding"""
        results = self.clause_collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )
        
        matches = []
        if results and results['ids'] and results['ids'][0]:
            for i, clause_id in enumerate(results['ids'][0]):
                score = 1 - results['distances'][0][i] if results['distances'] else 0
                matches.append({
                    "clause_id": clause_id,
                    "document": results['documents'][0][i] if results['documents'] else "",
                    "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
                    "similarity_score": score
                })
        
        return matches
    
    def get_policy_count(self) -> int:
        """Get total number of policies in vector store"""
        return self.policy_collection.count()
    
    def get_clause_count(self) -> int:
        """Get total number of clauses in vector store"""
        return self.clause_collection.count()
    
    def clear_policies(self):
        """Clear all policy embeddings"""
        # Delete and recreate collection
        self.client.delete_collection("policies")
        self.policy_collection = self.client.create_collection(
            name="policies",
            metadata={"description": "Bank policy embeddings"}
        )
    
    def clear_clauses(self):
        """Clear all clause embeddings"""
        self.client.delete_collection("clauses")
        self.clause_collection = self.client.create_collection(
            name="clauses",
            metadata={"description": "Regulatory clause embeddings"}
        )


# Singleton instance
_vector_store: Optional[VectorStore] = None


def get_vector_store() -> VectorStore:
    """Get vector store singleton"""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore()
    return _vector_store


if __name__ == "__main__":
    # Test vector store
    vs = get_vector_store()
    print(f"✓ Vector store initialized")
    print(f"  Policy count: {vs.get_policy_count()}")
    print(f"  Clause count: {vs.get_clause_count()}")
