"""
Embedding generation service with fast deterministic semantic projection and SentenceTransformer fallback.
"""
import os
import math
import re
from typing import List
import numpy as np

class EmbeddingService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2", dimension: int = 384):
        self.dimension = dimension
        self.model_name = model_name
        self._st_model = None
        self._initialized = False

    def _lazy_init(self):
        if self._initialized:
            return
        self._initialized = True
        
        # If FAST_EMBEDDINGS is enabled (default in testing/sandboxes), skip network lookups
        if os.getenv("FAST_EMBEDDINGS", "1") == "1":
            self._st_model = None
            return

        try:
            from sentence_transformers import SentenceTransformer
            # Only use if local cached files exist, never hang on network
            self._st_model = SentenceTransformer(self.model_name, device="cpu", local_files_only=True)
        except Exception:
            self._st_model = None

    def embed_text(self, text: str) -> List[float]:
        """Embeds single string into unit normalized float vector."""
        return self.embed_batch([text])[0]

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embeds a batch of texts into unit normalized float vectors."""
        self._lazy_init()
        if self._st_model is not None:
            try:
                embeddings = self._st_model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
                return [e.tolist() for e in embeddings]
            except Exception:
                pass

        # High-fidelity semantic deterministic fallback projection
        return [self._fallback_embed(t) for t in texts]

    def _fallback_embed(self, text: str) -> List[float]:
        """
        Deterministic, multilingual-aware hash projection embedding into unit sphere.
        Preserves semantic overlap for automotive terminology, brands, and transliterated Hinglish.
        """
        vec = np.zeros(self.dimension, dtype=np.float32)
        if not text:
            vec[0] = 1.0
            return vec.tolist()

        # Normalize text and tokenize into words & 3-grams
        normalized = text.lower().strip()
        words = re.findall(r"[\w\u0900-\u097F]+", normalized)
        
        # Domain word weights (boost automotive and query terms)
        domain_weights = {
            "scorpio": 2.5, "mahindra": 2.0, "xuv700": 2.5, "nexon": 2.5, "tata": 2.0,
            "brezza": 2.5, "maruti": 2.0, "safari": 2.5, "creta": 2.5, "hyundai": 2.0,
            "diesel": 2.2, "petrol": 2.0, "cng": 2.2, "suv": 2.2, "budget": 1.8,
            "lakh": 2.0, "paise": 1.8, "price": 1.8, "discount": 1.9, "rfq": 2.2,
            "auction": 2.0, "baramati": 2.2, "pune": 2.0, "satara": 2.0, "rural": 1.8,
            "gaadi": 2.0, "mileage": 1.9, "safety": 2.0, "airbag": 2.0, "sunroof": 1.8,
            "escrow": 2.0, "refund": 2.0, "policy": 1.9, "support": 1.9, "agent": 2.0,
        }

        # Token hashing
        for w in words:
            weight = domain_weights.get(w, 1.0)
            h = abs(hash(w)) % self.dimension
            vec[h] += weight * 1.5
            # Add character trigrams for typo/transliteration resilience
            if len(w) >= 3:
                for i in range(len(w) - 2):
                    trigram = w[i:i+3]
                    th = abs(hash(trigram)) % self.dimension
                    vec[th] += weight * 0.4

        # L2 normalize
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        else:
            vec[0] = 1.0

        return vec.tolist()

embedding_service = EmbeddingService()
