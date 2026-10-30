"""
Hybrid search combining BM25 lexical search and dense vector search with
Reciprocal Rank Fusion (RRF) and Hinglish query query expansion.
"""
import re
from typing import List, Tuple, Dict, Any, Optional
from app.ingestion.chunker import Chunk
from app.retrieval.bm25 import BM25Index
from app.retrieval.vector_store import VectorStore
from app.config import settings

# Hinglish & Multilingual automotive domain term expansion
MULTILINGUAL_SYNONYMS = {
    r"\bgaadi\b": "car vehicle SUV",
    r"\bgadi\b": "car vehicle SUV",
    r"\bkitna deti hai\b": "mileage fuel efficiency km/l km/kg",
    r"\bkitna mileage\b": "fuel efficiency ARAI mileage",
    r"\bmaaylej\b": "mileage fuel economy",
    r"\bsuraksha\b": "safety NCAP airbags rating",
    r"\bsafe\b": "safety crash test 5-star",
    r"\bsadak\b": "road terrain ground clearance",
    r"\brasta\b": "road ground clearance rural",
    r"\bkharab\b": "rough terrain ground clearance water wading",
    r"\bkitne log\b": "seating capacity 7-seater 6-seater",
    r"\bparivaar\b": "family 7-seater spacious",
    r"\bkutumb\b": "family 7-seater",
    r"\bpaise\b": "price cost budget ex-showroom on-road",
    r"\bbachat\b": "savings discount reverse auction",
    r"\bsavalat\b": "discount offer savings",
    r"\bsarkari\b": "RTO tax registration government",
}

def expand_multilingual_query(query: str) -> str:
    """Expands Hinglish, Hindi, and Marathi terms to improve retrieval recall."""
    expanded = query
    for pattern, expansion in MULTILINGUAL_SYNONYMS.items():
        if re.search(pattern, expanded, flags=re.IGNORECASE):
            expanded += f" {expansion}"
    return expanded

class HybridRetriever:
    def __init__(self, bm25_index: BM25Index, vector_store: VectorStore):
        self.bm25_index = bm25_index
        self.vector_store = vector_store

    def search(
        self,
        query: str,
        top_k: int = 5,
        filters: Optional[Dict[str, Any]] = None,
        bm25_weight: float = settings.bm25_weight,
        vector_weight: float = settings.vector_weight,
    ) -> List[Tuple[Chunk, float]]:
        """
        Executes hybrid search combining BM25 & dense vector search using
        Reciprocal Rank Fusion (RRF) and linear normalized fusion.
        """
        # 1. Expand query for multilingual / Hinglish nuances
        expanded_query = expand_multilingual_query(query)

        # 2. Retrieve candidates from both sources
        bm25_results = self.bm25_index.search(expanded_query, top_k=top_k * 3)
        vector_results = self.vector_store.search(expanded_query, top_k=top_k * 3, filters=filters)

        # 3. Reciprocal Rank Fusion (RRF)
        rrf_constant = 60.0
        scores_by_chunk_id: Dict[str, float] = {}
        chunks_by_id: Dict[str, Chunk] = {}

        # BM25 RRF score
        for rank, (chunk, _) in enumerate(bm25_results):
            cid = chunk.chunk_id
            chunks_by_id[cid] = chunk
            scores_by_chunk_id[cid] = scores_by_chunk_id.get(cid, 0.0) + (bm25_weight / (rrf_constant + rank + 1))

        # Vector RRF score
        for rank, (chunk, _) in enumerate(vector_results):
            cid = chunk.chunk_id
            chunks_by_id[cid] = chunk
            scores_by_chunk_id[cid] = scores_by_chunk_id.get(cid, 0.0) + (vector_weight / (rrf_constant + rank + 1))

        if not scores_by_chunk_id:
            return []

        # 4. Normalize RRF scores to 0.0 - 1.0 range
        max_score = max(scores_by_chunk_id.values())
        min_score = min(scores_by_chunk_id.values())
        spread = max_score - min_score if max_score > min_score else max_score

        ranked: List[Tuple[Chunk, float]] = []
        for cid, raw_score in sorted(scores_by_chunk_id.items(), key=lambda x: x[1], reverse=True):
            normalized_score = 0.5 + 0.5 * (raw_score / max_score) if max_score > 0 else 0.0
            ranked.append((chunks_by_id[cid], round(normalized_score, 4)))

        return ranked[:top_k]
