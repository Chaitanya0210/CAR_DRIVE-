"""
Human handoff detector: detects low confidence, user explicit requests, and dispute escalation.
"""
import re
from typing import Optional
from pydantic import BaseModel

HUMAN_REQUEST_PATTERNS = [
    r"\b(talk|speak)\s+to\s+(a\s+)?(human|agent|person|representative|executive)\b",
    r"\bconnect\s+(me\s+)?to\s+(an?\s+)?(agent|human|support|executive)\b",
    r"\bcall\s+customer\s+(care|support)\b",
    r"\bcustomer\s+care\s+(number|phone|contact)\b",
    r"\bagent\s+se\s+baat\b",
    r"\binsaan\s+se\s+baat\b",
    r"\bhuman\s+support\b",
    r"\bsupport\s+team\s+se\s+connect\b",
    r"\bफोन\s+लावा\b",
    r"\bमाणसाशी\s+बोलायचे\b",
    r"\bअधिकारी\s+शी\s+बात\b",
]

DISPUTE_PATTERNS = [
    r"\b(consumer\s+court|police\s+complaint|cheated|scam|fraud|lawyer|fir)\b",
    r"\bdispute\s+resolution\b",
    r"\bmoney\s+stolen\b",
]

class HandoffDecision(BaseModel):
    needs_handoff: bool
    reason: Optional[str] = None  # USER_EXPLICIT, LOW_CONFIDENCE, DISPUTE
    department: str = "SUPPORT"   # SUPPORT, SALES, DISPUTE, FINANCE
    handoff_message: Optional[str] = None

class HumanHandoffDetector:
    def check_handoff(
        self,
        query: str,
        retrieval_confidence: float = 1.0,
        min_confidence_threshold: float = 0.35,
        language: str = "en",
    ) -> HandoffDecision:
        query_lower = query.lower()

        # 1. Dispute / Legal escalation
        for pattern in DISPUTE_PATTERNS:
            if re.search(pattern, query_lower):
                return HandoffDecision(
                    needs_handoff=True,
                    reason="DISPUTE",
                    department="DISPUTE",
                    handoff_message=(
                        "I am escalating your concern to our senior dispute resolution officer immediately. "
                        "A representative will contact you within 2 business hours. Reference Ticket #GD-DISPUTE-PRIORITY."
                    ),
                )

        # 2. User explicit request for human
        for pattern in HUMAN_REQUEST_PATTERNS:
            if re.search(pattern, query_lower):
                msg = (
                    "Namaste! Mai aapko hamare GroupDrive rural car support executive se connect kar raha hoon. "
                    "Hamare specialist aapse WhatsApp/Phone pe sampark karenge."
                    if any(w in query_lower for w in ["baat", "se", "hai", "bhai", "namaste"])
                    else "Connecting you to a GroupDrive support specialist. Our team will assist you directly."
                )
                return HandoffDecision(
                    needs_handoff=True,
                    reason="USER_EXPLICIT",
                    department="SUPPORT",
                    handoff_message=msg,
                )

        # 3. Low retrieval confidence
        if retrieval_confidence < min_confidence_threshold:
            return HandoffDecision(
                needs_handoff=True,
                reason="LOW_CONFIDENCE",
                department="SALES",
                handoff_message=(
                    "I don't have enough verified platform documentation to give you a definitive answer on this. "
                    "Would you like me to connect you with a GroupDrive automotive specialist for your district?"
                ),
            )

        return HandoffDecision(needs_handoff=False)

human_handoff_detector = HumanHandoffDetector()
