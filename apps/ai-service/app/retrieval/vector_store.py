"""
Vector store for pgvector and in-memory cosine similarity search.
"""
from typing import List, Tuple, Optional, Dict, Any
import numpy as np
from app.ingestion.chunker import Chunk
from app.ingestion.embeddings import embedding_service

class VectorStore:
    def __init__(self):
        self.chunks: List[Chunk] = []
        self.embeddings: np.ndarray = np.empty((0, 384), dtype=np.float32)

    def add_chunks(self, chunks: List[Chunk], embeddings: Optional[List[List[float]]] = None):
        """Registers chunks and their vector embeddings."""
        if not chunks:
            return
            
        if embeddings is None:
            texts = [c.content for c in chunks]
            embeddings = embedding_service.embed_batch(texts)

        emb_matrix = np.array(embeddings, dtype=np.float32)
        
        # Ensure L2 normalization
        norms = np.linalg.norm(emb_matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        emb_matrix = emb_matrix / norms

        if self.embeddings.shape[0] == 0:
            self.embeddings = emb_matrix
        else:
            self.embeddings = np.vstack([self.embeddings, emb_matrix])
            
        self.chunks.extend(chunks)

    def search(
        self,
        query: str,
        top_k: int = 10,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Tuple[Chunk, float]]:
        """Performs dense semantic vector search via cosine similarity."""
        if self.embeddings.shape[0] == 0:
            return []

        query_vec = np.array(embedding_service.embed_text(query), dtype=np.float32)
        q_norm = np.linalg.norm(query_vec)
        if q_norm > 0:
            query_vec = query_vec / q_norm

        # Cosine similarity is dot product of normalized vectors
        scores = np.dot(self.embeddings, query_vec)

        results: List[Tuple[Chunk, float]] = []
        for idx in np.argsort(-scores):
            chunk = self.chunks[idx]
            score = float(scores[idx])

            # Apply metadata filters if provided
            if filters:
                match = True
                for k, v in filters.items():
                    if v is not None and getattr(chunk, k, None) != v:
                        match = False
                        break
                if not match:
                    continue

            results.append((chunk, score))
            if len(results) >= top_k:
                break

        return results

vector_store = VectorStore()
