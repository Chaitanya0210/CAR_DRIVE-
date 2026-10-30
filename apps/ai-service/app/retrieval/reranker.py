"""
Cross-relevance reranker, confidence calibration, and citation generator.
"""
from typing import List, Tuple, Dict, Any, Optional
from pydantic import BaseModel
import re
from app.ingestion.chunker import Chunk
from app.config import settings

class Citation(BaseModel):
    chunk_id: str
    doc_id: str
    source_title: str
    section_title: str
    brand: Optional[str] = None
    model: Optional[str] = None
    source: str
    snippet: str
    confidence: float

class RerankResult(BaseModel):
    chunks: List[Chunk]
    citations: List[Citation]
    top_confidence: float
    should_refuse: bool
    refusal_reason: Optional[str] = None

class Reranker:
    def __init__(self, min_confidence: float = settings.min_retrieval_confidence):
        self.min_confidence = min_confidence

    def rerank(
        self,
        query: str,
        candidates: List[Tuple[Chunk, float]],
        top_n: int = settings.max_retrieval_chunks,
    ) -> RerankResult:
        if not candidates:
            return RerankResult(
                chunks=[],
                citations=[],
                top_confidence=0.0,
                should_refuse=True,
                refusal_reason="NO_MATCHING_CONTEXT",
            )

        query_lower = query.lower()
        query_words = set(re.findall(r"\w+", query_lower))
        
        scored_candidates: List[Tuple[Chunk, float]] = []

        for chunk, hybrid_score in candidates:
            score = hybrid_score
            content_lower = chunk.content.lower()
            title_lower = chunk.section_title.lower()

            # 1. Exact model/brand match bonus
            if chunk.brand and chunk.brand.lower() in query_lower:
                score += 0.20
            if chunk.model and chunk.model.lower() in query_lower:
                score += 0.25
            if chunk.variant and any(v.strip().lower() in query_lower for v in chunk.variant.split(",")):
                score += 0.20

            # 2. Section title overlap
            title_words = set(re.findall(r"\w+", title_lower))
            if title_words and query_words:
                title_overlap = len(title_words.intersection(query_words)) / len(title_words)
                score += title_overlap * 0.15

            # 3. Intent alignment bonus
            is_policy_query = any(w in query_lower for w in ["auction", "reverse", "policy", "refund", "safe", "escrow", "threshold", "rule", "paise"])
            if is_policy_query and chunk.source in ["policy", "faq"]:
                score += 0.15

            is_spec_query = any(w in query_lower for w in ["mileage", "spec", "ground clearance", "sunroof", "airbag", "boot", "engine", "torque", "power"])
            if is_spec_query and chunk.source == "brochure":
                score += 0.15

            # Calibrate to max 1.0
            calibrated_score = min(1.0, max(0.0, score))
            scored_candidates.append((chunk, calibrated_score))

        # Sort by reranked score descending
        scored_candidates.sort(key=lambda x: x[1], reverse=True)
        top_candidates = scored_candidates[:top_n]

        top_confidence = top_candidates[0][1] if top_candidates else 0.0
        should_refuse = top_confidence < self.min_confidence

        # Build structured citations
        citations: List[Citation] = []
        for chunk, conf in top_candidates:
            # Extract first 200 chars of relevant snippet
            clean_snippet = re.sub(r"[#*|]+", " ", chunk.content[:240]).strip()
            doc_title = chunk.metadata.get("title", chunk.doc_id)
            citations.append(Citation(
                chunk_id=chunk.chunk_id,
                doc_id=chunk.doc_id,
                source_title=doc_title,
                section_title=chunk.section_title,
                brand=chunk.brand,
                model=chunk.model,
                source=chunk.source,
                snippet=f"{clean_snippet}...",
                confidence=round(conf, 3),
            ))

        return RerankResult(
            chunks=[c for c, _ in top_candidates],
            citations=citations,
            top_confidence=round(top_confidence, 3),
            should_refuse=should_refuse,
            refusal_reason="CONFIDENCE_BELOW_THRESHOLD" if should_refuse else None,
        )

reranker = Reranker()
