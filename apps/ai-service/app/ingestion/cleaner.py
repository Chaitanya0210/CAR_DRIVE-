"""
Text cleaner for GroupDrive documents preserving tables and Markdown structure.
"""
import re
import unicodedata

def clean_document_text(text: str) -> str:
    """
    Cleans raw document text while preserving Markdown headers, bullet lists,
    and structured variant/spec tables intact.
    """
    if not text:
        return ""
    
    # 1. Normalize unicode (handles Devanagari characters and diacritics)
    text = unicodedata.normalize("NFKC", text)
    
    # 2. Normalize Windows/Unix line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    
    # 3. Replace non-standard whitespace but preserve newlines
    lines = text.split("\n")
    cleaned_lines = []
    
    for line in lines:
        stripped = line.strip()
        # Keep empty lines as single blank lines
        if not stripped:
            cleaned_lines.append("")
            continue
            
        # Detect markdown table rows (| ... |) and preserve formatting exactly
        if stripped.startswith("|") and stripped.endswith("|"):
            cleaned_lines.append(stripped)
            continue
            
        # Collapse multiple spaces within normal text lines
        cleaned_line = re.sub(r"[ \t]+", " ", stripped)
        cleaned_lines.append(cleaned_line)
    
    # 4. Collapse 3+ consecutive newlines to 2 newlines
    result = "\n".join(cleaned_lines)
    result = re.sub(r"\n{3,}", "\n\n", result)
    
    return result.strip()
