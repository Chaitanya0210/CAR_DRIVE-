"""
Okapi BM25 Lexical Index supporting English, Devanagari (Hindi, Marathi) & alphanumeric codes.
"""
import math
import re
from typing import List, Dict, Tuple
from app.ingestion.chunker import Chunk

def tokenize(text: str) -> List[str]:
    """Tokenizes text into lowercase words, Devanagari tokens, and codes like 4x4, z8."""
    text = text.lower()
    # Normalize some common transliterated Hinglish prefixes
    tokens = re.findall(r"[\w\u0900-\u097F]+", text)
    return tokens

class BM25Index:
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.chunks: List[Chunk] = []
        self.doc_len: List[int] = []
        self.avg_doc_len: float = 0.0
        self.doc_freq: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}
        self.term_freqs: List[Dict[str, int]] = []

    def fit(self, chunks: List[Chunk]):
        self.chunks = chunks
        self.doc_len = []
        self.term_freqs = []
        self.doc_freq = {}
        
        N = len(chunks)
        if N == 0:
            self.avg_doc_len = 0.0
            return

        total_len = 0
        for chunk in chunks:
            # Combine title + content + metadata keywords for rich lexical coverage
            full_text = f"{chunk.section_title} {chunk.brand or ''} {chunk.model or ''} {chunk.variant or ''} {chunk.content}"
            tokens = tokenize(full_text)
            length = len(tokens)
            self.doc_len.append(length)
            total_len += length
            
            tf: Dict[str, int] = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1
            self.term_freqs.append(tf)
            
            for t in set(tokens):
                self.doc_freq[t] = self.doc_freq.get(t, 0) + 1
                
        self.avg_doc_len = total_len / float(N) if N > 0 else 1.0

        # Precompute Robertson-Spärck Jones IDF
        for term, df in self.doc_freq.items():
            self.idf[term] = math.log(1.0 + (N - df + 0.5) / (df + 0.5))

    def search(self, query: str, top_k: int = 10) -> List[Tuple[Chunk, float]]:
        if not self.chunks:
            return []

        query_tokens = tokenize(query)
        scores = [0.0] * len(self.chunks)

        for i, tf in enumerate(self.term_freqs):
            dl = self.doc_len[i]
            score = 0.0
            for t in query_tokens:
                if t in tf:
                    freq = tf[t]
                    idf = self.idf.get(t, 0.0)
                    numerator = freq * (self.k1 + 1.0)
                    denominator = freq + self.k1 * (1.0 - self.b + self.b * (dl / self.avg_doc_len))
                    score += idf * (numerator / denominator)
            scores[i] = score

        # Rank documents
        ranked_indices = sorted(range(len(scores)), key=lambda idx: scores[idx], reverse=True)
        results: List[Tuple[Chunk, float]] = []
        
        for idx in ranked_indices[:top_k]:
            if scores[idx] > 0:
                results.append((self.chunks[idx], scores[idx]))

        return results
