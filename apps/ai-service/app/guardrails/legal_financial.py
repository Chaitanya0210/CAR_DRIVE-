"""
Guardrail against unauthorized legal or financial guarantees.
Enforces statutory platform disclaimers and sanitizes promissory commitments.
"""
import re
from typing import Tuple

PLATFORM_DISCLAIMER = (
    "\n\n*Disclaimer: All pricing, tax rates, loan calculations, and reverse-auction group discounts "
    "are indicative estimates based on verified dealer quotes and subject to final dealer agreement "
    "and state RTO verification.*"
)

PROMISSORY_PATTERNS = [
    (r"\bguarantee(d)?\s+100%\s+loan\s+approval\b", "loan approval is subject to bank credit assessment"),
    (r"\blegally\s+binding\s+promise\b", "indicative platform commitment"),
    (r"\bguaranteed\s+profit\b", "potential group savings"),
    (r"\bzero\s+risk\s+guaranteed\b", "protected under GroupDrive platform escrow policy"),
    (r"\b100%\s+guaranteed\s+lowest\s+price\s+in\s+the\s+world\b", "competitive reverse-auction landed quote"),
]

def sanitize_guarantees(text: str) -> Tuple[str, bool]:
    """
    Scans for illegal financial/legal promises, replaces with safe language,
    and appends statutory platform disclaimer if not already present.
    """
    if not text:
        return "", False

    modified = False
    sanitized = text

    for pattern, replacement in PROMISSORY_PATTERNS:
        if re.search(pattern, sanitized, flags=re.IGNORECASE):
            modified = True
            sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)

    # Ensure disclaimer is attached
    if "Disclaimer:" not in sanitized:
        sanitized = sanitized.rstrip() + PLATFORM_DISCLAIMER

    return sanitized, modified
