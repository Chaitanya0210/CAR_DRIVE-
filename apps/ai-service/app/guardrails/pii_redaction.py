"""
PII redaction utility for logs and customer queries.
Redacts Indian Phone Numbers, Aadhaar Numbers, PAN, and Email Addresses.
"""
import re

PII_PATTERNS = [
    # 1. Aadhaar Number (12 digits with optional spaces or hyphens)
    (r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b", "[REDACTED_AADHAAR]"),
    
    # 2. Indian PAN Number (5 letters, 4 digits, 1 letter)
    (r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b", "[REDACTED_PAN]"),
    
    # 3. Indian Phone Numbers (10 digits with optional +91 or 0 prefix)
    (r"(?:\+91[\s-]?)?[6-9]\d{9}\b", "[REDACTED_PHONE]"),
    
    # 4. Email Addresses
    (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "[REDACTED_EMAIL]"),
    
    # 5. Bank Account Numbers (9 to 18 consecutive digits with 'ac' or 'account' context)
    (r"(?:a/c|ac|account\s*(?:no|number)?[:\s]*)(\d{9,18})\b", "[REDACTED_ACCOUNT]"),
    
    # 6. Auth Tokens & JWTs
    (r"\b(?:Bearer\s+)?(eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+)\b", "[REDACTED_JWT_TOKEN]"),
    (r"\bgd_(?:buyer|seller|admin|conf)_[a-f0-9]{24,64}\b", "[REDACTED_SECRET_TOKEN]"),
]

def redact_pii(text: str) -> str:
    """Replaces sensitive identifiers with masked tokens."""
    if not text:
        return ""
    
    redacted = text
    for pattern, replacement in PII_PATTERNS:
        redacted = re.sub(pattern, replacement, redacted, flags=re.IGNORECASE)
        
    return redacted
