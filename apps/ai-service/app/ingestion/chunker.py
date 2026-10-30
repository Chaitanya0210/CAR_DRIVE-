"""
Structure-aware chunker for automotive brochures, policy docs, and deal summaries.
Preserves Markdown tables, spec matrices, and section boundaries.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import re

class Chunk(BaseModel):
    chunk_id: str
    doc_id: str
    section_title: str
    content: str
    brand: Optional[str] = None
    model: Optional[str] = None
    variant: Optional[str] = None
    source: str  # brochure, policy, deal_summary, faq
    language: str  # en, hi, mr, hinglish
    token_count: int
    has_table: bool
    metadata: Dict[str, Any] = {}

def estimate_tokens(text: str) -> int:
    """Fast token count approximation (1 token ~= 4 chars or 0.75 words)"""
    words = len(text.split())
    return max(1, int(words * 1.3))

def is_table_row(line: str) -> bool:
    stripped = line.strip()
    return stripped.startswith("|") and stripped.endswith("|")

def chunk_document(
    doc_id: str,
    text: str,
    source: str = "brochure",
    brand: Optional[str] = None,
    model: Optional[str] = None,
    variant: Optional[str] = None,
    language: str = "en",
    max_tokens: int = 500,
    metadata: Optional[Dict[str, Any]] = None,
) -> List[Chunk]:
    """
    Splits text by markdown sections (## or ###) ensuring that any table
    is kept 100% intact within its chunk.
    """
    metadata = metadata or {}
    lines = text.split("\n")
    
    sections: List[Dict[str, Any]] = []
    current_title = "Overview"
    current_lines: List[str] = []
    
    for line in lines:
        stripped = line.strip()
        # Header detection
        if stripped.startswith("#") and not is_table_row(stripped):
            # If we already have lines, push current section
            if current_lines:
                sections.append({
                    "title": current_title,
                    "content": "\n".join(current_lines).strip()
                })
                current_lines = []
            current_title = stripped.lstrip("#").strip()
        else:
            current_lines.append(line)
            
    if current_lines:
        sections.append({
            "title": current_title,
            "content": "\n".join(current_lines).strip()
        })
        
    chunks: List[Chunk] = []
    chunk_counter = 1
    
    for sec in sections:
        sec_title = sec["title"]
        sec_content = sec["content"]
        if not sec_content:
            continue
            
        sec_lines = sec_content.split("\n")
        
        # Check if entire section fits in max_tokens
        sec_tokens = estimate_tokens(sec_content)
        has_table = any(is_table_row(l) for l in sec_lines)
        
        if sec_tokens <= max_tokens or has_table:
            # If section has a table or fits in size, keep it as single intact chunk
            chunk_id = f"{doc_id}#sec-{chunk_counter:02d}"
            chunks.append(Chunk(
                chunk_id=chunk_id,
                doc_id=doc_id,
                section_title=sec_title,
                content=f"## {sec_title}\n\n{sec_content}",
                brand=brand,
                model=model,
                variant=variant,
                source=source,
                language=language,
                token_count=sec_tokens,
                has_table=has_table,
                metadata=metadata
            ))
            chunk_counter += 1
        else:
            # Sub-chunk by paragraphs without breaking sentences
            paragraphs = sec_content.split("\n\n")
            curr_para_block: List[str] = []
            curr_block_tokens = 0
            
            for para in paragraphs:
                p_tokens = estimate_tokens(para)
                if curr_block_tokens + p_tokens > max_tokens and curr_para_block:
                    block_text = "\n\n".join(curr_para_block)
                    chunk_id = f"{doc_id}#sec-{chunk_counter:02d}"
                    chunks.append(Chunk(
                        chunk_id=chunk_id,
                        doc_id=doc_id,
                        section_title=sec_title,
                        content=f"## {sec_title}\n\n{block_text}",
                        brand=brand,
                        model=model,
                        variant=variant,
                        source=source,
                        language=language,
                        token_count=curr_block_tokens,
                        has_table=False,
                        metadata=metadata
                    ))
                    chunk_counter += 1
                    curr_para_block = [para]
                    curr_block_tokens = p_tokens
                else:
                    curr_para_block.append(para)
                    curr_block_tokens += p_tokens
                    
            if curr_para_block:
                block_text = "\n\n".join(curr_para_block)
                chunk_id = f"{doc_id}#sec-{chunk_counter:02d}"
                chunks.append(Chunk(
                    chunk_id=chunk_id,
                    doc_id=doc_id,
                    section_title=sec_title,
                    content=f"## {sec_title}\n\n{block_text}",
                    brand=brand,
                    model=model,
                    variant=variant,
                    source=source,
                    language=language,
                    token_count=curr_block_tokens,
                    has_table=False,
                    metadata=metadata
                ))
                chunk_counter += 1
                
    return chunks
