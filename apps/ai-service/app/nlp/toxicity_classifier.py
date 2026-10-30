"""
Review toxicity and spam classifier for buyer reviews and dealer feedback.
Detects vulgarity, abuse, competitor spam, phone advertisements, and scams.
"""
import re
from typing import List
from pydantic import BaseModel
from app.config import settings

TOXIC_TERMS = [
    r"\b(idiot|fool|stupid|bastard|fraud|scammer|thief|scoundrel)\b",
    r"\b(bakwas|chutiya|harami|kamina|sala|fraudster|dhokhebaaz)\b",
    r"\b(chutiye|madarchod|bhenchod|gandu|bhadwe)\b",
    r"\b(nalayak|fashavle|chor)\b",
    r"\b(kill|beat|destroy|ruin\s+you)\b",
]

SPAM_PATTERNS = [
    r"https?:\/\/[^\s]+",
    r"www\.[^\s]+",
    r"\b(?:call|whatsapp|contact)\s*(?:me|now|at)?[:\s]*\+?[0-9]{10,12}\b",
    r"\b(?:earn\s+money|crypto|bitcoin|work\s+from\s+home|lottery|win\s+cash)\b",
    r"\b(?:buy\s+cheap|visit\s+site|discount\s+coupon)\b",
]

class ReviewClassificationResult(BaseModel):
    is_toxic: bool
    toxicity_score: float
    is_spam: bool
    spam_score: float
    action: str  # ALLOW, FLAG_FOR_MODERATION, REJECT
    flagged_categories: List[str] = []

class ToxicityClassifier:
    def classify(self, text: str) -> ReviewClassificationResult:
        if not text:
            return ReviewClassificationResult(
                is_toxic=False,
                toxicity_score=0.0,
                is_spam=False,
                spam_score=0.0,
                action="ALLOW",
                flagged_categories=[],
            )

        t_lower = text.lower()
        toxic_matches = 0
        spam_matches = 0
        categories: List[str] = []

        # 1. Toxicity Check
        for term in TOXIC_TERMS:
            matches = len(re.findall(term, t_lower, flags=re.IGNORECASE))
            if matches > 0:
                toxic_matches += matches
                if "ABUSIVE_LANGUAGE" not in categories:
                    categories.append("ABUSIVE_LANGUAGE")

        # 2. Spam Check
        for pattern in SPAM_PATTERNS:
            matches = len(re.findall(pattern, t_lower, flags=re.IGNORECASE))
            if matches > 0:
                spam_matches += matches
                if "COMMERCIAL_SPAM" not in categories:
                    categories.append("COMMERCIAL_SPAM")

        # Excessive repetition check (e.g. "aaaaaa", "!!!!!!")
        if re.search(r"(.)\1{4,}", text):
            spam_matches += 1
            if "REPETITIVE_CHARACTER_SPAM" not in categories:
                categories.append("REPETITIVE_CHARACTER_SPAM")

        # Compute calibrated scores (0.0 to 1.0)
        toxicity_score = min(1.0, toxic_matches * 0.45)
        spam_score = min(1.0, spam_matches * 0.50)

        is_toxic = toxicity_score >= settings.toxicity_threshold
        is_spam = spam_score >= settings.spam_threshold

        if toxicity_score >= 0.85 or spam_score >= 0.85:
            action = "REJECT"
        elif is_toxic or is_spam or toxicity_score >= 0.40 or spam_score >= 0.40:
            action = "FLAG_FOR_MODERATION"
        else:
            action = "ALLOW"

        return ReviewClassificationResult(
            is_toxic=is_toxic,
            toxicity_score=round(toxicity_score, 2),
            is_spam=is_spam,
            spam_score=round(spam_score, 2),
            action=action,
            flagged_categories=categories,
        )

toxicity_classifier = ToxicityClassifier()
