"""
Prompt injection and jailbreak detector for user queries and retrieved texts.
"""
import re
from typing import Tuple

SUSPICIOUS_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?",
    r"disregard\s+(all\s+)?(previous|prior)\s+instructions?",
    r"forget\s+(all\s+)?(rules|instructions)",
    r"system\s*prompt\s*:",
    r"you\s+are\s+now\s+(an?\s+)?unrestricted",
    r"dan\s+mode",
    r"developer\s+mode\s+enabled",
    r"bypass\s+all\s+(filters|guardrails)",
    r"<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>",
    r"javascript\s*:",
]

class InjectionFilter:
    def check_and_sanitize(self, text: str) -> Tuple[str, bool]:
        """
        Scans text for injection attempts.
        Returns (sanitized_text, is_injection_detected).
        """
        if not text:
            return "", False

        is_detected = False
        sanitized = text

        for pattern in SUSPICIOUS_PATTERNS:
            if re.search(pattern, sanitized, flags=re.IGNORECASE):
                is_detected = True
                # Neutralize matching phrase
                sanitized = re.sub(pattern, "[BLOCKED_INJECTION_ATTEMPT]", sanitized, flags=re.IGNORECASE)

        return sanitized, is_detected

injection_filter = InjectionFilter()
