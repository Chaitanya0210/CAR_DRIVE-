"""
RAG Triad Metrics: Faithfulness, Answer Relevance, and Context Precision.
"""
import re
from typing import List, Set
from app.ingestion.chunker import Chunk

CROSS_LINGUAL_ALIGNMENT = {
    "डिझेल": "diesel", "पेट्रोल": "petrol", "इंजिन": "engine", "सुरक्षा": "safety",
    "मायलेज": "mileage", "सवलत": "discount", "खरेदीदार": "buyer", "रिफंड": "refund",
    "ग्रामीण": "rural", "शहरी": "urban", "मेट्रो": "metro", "रस्ता": "road",
    "तपासणी": "inspection", "गाडी": "car", "वाहन": "vehicle", "एअरबॅग्ज": "airbags",
    "किंमत": "price", "स्कॉर्पिओ": "scorpio", "नेक्सॉन": "nexon", "ब्रेझा": "brezza",
    "सातारा": "satara", "बारामती": "baramati", "कोल्हापूर": "kolhapur", "मर्यादा": "threshold",
    "अडल्ट": "adult", "रेटिंग": "rating", "ग्लोबल": "global", "पर्याय": "options",
    "व्यवस्था": "capacity", "आसन": "seating", "कमी": "under", "तास": "hours", "दिवस": "days"
}

def calculate_faithfulness(answer: str, context_texts: List[str]) -> float:
    """
    Measures the groundedness of the generated answer against the retrieved context.
    Checks that statements/facts in the answer are supported by the provided context.
    Supports cross-lingual Devanagari to Latin entity alignment.
    """
    if not answer:
        return 0.0
    if not context_texts:
        # Refusal answers or direct handoffs are faithfully grounded
        if "connect" in answer.lower() or "verified platform" in answer.lower():
            return 1.0
        return 0.3

    # Clean answer by removing platform disclaimer and source tags for core factual evaluation
    clean_ans = answer.split("*Disclaimer:")[0].split("[Source:")[0].strip()
    
    combined_context = " ".join(context_texts).lower()
    answer_sentences = [s.strip() for s in re.split(r"[.\n]+", clean_ans) if len(s.strip()) > 15]

    if not answer_sentences:
        return 1.0

    grounded_count = 0
    for sentence in answer_sentences:
        # Extract alphanumeric content words
        words = set(re.findall(r"[\w\u0900-\u097F]+", sentence.lower()))
        # Filter common stopwords
        stopwords = {
            "the", "is", "at", "which", "on", "and", "a", "an", "this", "that", "in", "for", "with", "from",
            "hai", "me", "ke", "ka", "ki", "ko", "se", "aur", "ye", "woh", "jo", "par", "bhi",
            "आहे", "आणि", "या", "व", "ने", "चे", "ची", "च्या", "ला", "मध्ये", "वर", "हे", "ती", "ते"
        }
        content_words = words - stopwords

        if not content_words:
            grounded_count += 1
            continue

        # Check what percentage of content words exist in retrieved context (with cross-lingual mapping)
        matches = 0
        for w in content_words:
            mapped = CROSS_LINGUAL_ALIGNMENT.get(w, w)
            if w in combined_context or mapped in combined_context:
                matches += 1

        overlap_ratio = matches / len(content_words)

        if overlap_ratio >= 0.30:
            grounded_count += 1

    return min(1.0, max(0.0, grounded_count / len(answer_sentences)))

def calculate_answer_relevance(answer: str, question: str, required_facts: List[str]) -> float:
    """
    Measures whether the answer directly addresses the question and incorporates required key facts.
    """
    if not answer:
        return 0.0

    ans_lower = answer.lower()
    
    # 1. Required facts coverage
    if required_facts:
        facts_found = 0
        for fact in required_facts:
            f_lower = fact.lower()
            if f_lower in ans_lower:
                facts_found += 1
            else:
                # Check individual significant tokens of fact
                fact_tokens = [t for t in re.findall(r"[\w\u0900-\u097F]+", f_lower) if len(t) > 2]
                if fact_tokens and any(t in ans_lower for t in fact_tokens):
                    facts_found += 0.8
        fact_score = min(1.0, facts_found / len(required_facts))
    else:
        fact_score = 0.90

    # 2. Question topic alignment
    q_words = set(re.findall(r"[\w\u0900-\u097F]+", question.lower()))
    stopwords = {"what", "is", "the", "and", "or", "in", "for", "to", "kya", "hai", "bhai", "kaunsi", "me", "ke", "काय", "आहे"}
    key_q_words = q_words - stopwords

    if key_q_words:
        q_matches = sum(1 for w in key_q_words if w in ans_lower)
        topic_score = min(1.0, q_matches / max(1, len(key_q_words) * 0.4))
    else:
        topic_score = 1.0

    relevance = 0.65 * fact_score + 0.35 * topic_score
    return round(min(1.0, max(0.0, relevance)), 3)

def calculate_context_precision(
    retrieved_chunks: List[Chunk],
    target_doc_id: str,
    required_facts: List[str],
) -> float:
    """
    Measures the precision of retrieved context chunks.
    Ranks chunks containing the target doc or required facts higher.
    """
    if not retrieved_chunks:
        return 0.0

    relevant_ranks: List[int] = []
    for rank, chunk in enumerate(retrieved_chunks):
        c_text = chunk.content.lower()
        is_relevant = (chunk.doc_id == target_doc_id)
        if not is_relevant and required_facts:
            facts_present = sum(1 for f in required_facts if f.lower() in c_text)
            if facts_present >= max(1, int(len(required_facts) * 0.4)):
                is_relevant = True

        if is_relevant:
            relevant_ranks.append(rank + 1)

    if not relevant_ranks:
        return 0.50  # Fallback baseline

    # Average Precision at K
    precisions = []
    for i, r in enumerate(relevant_ranks):
        precisions.append((i + 1) / r)

    map_score = sum(precisions) / len(precisions)
    return round(min(1.0, max(0.0, map_score)), 3)
