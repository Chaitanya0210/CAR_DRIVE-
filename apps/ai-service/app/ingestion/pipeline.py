"""
Ingestion pipeline: cleans raw documents, chunks by section with intact tables,
generates embeddings, and registers chunks into the vector store.
"""
from typing import List, Dict, Any, Optional
from app.ingestion.cleaner import clean_document_text
from app.ingestion.chunker import chunk_document, Chunk
from app.ingestion.embeddings import embedding_service
from app.ingestion.corpus import KNOWLEDGE_DOCUMENTS

class IngestionPipeline:
    def __init__(self):
        self._chunks: List[Chunk] = []
        self._embeddings: List[List[float]] = []

    def process_raw_document(
        self,
        doc_id: str,
        text: str,
        source: str = "brochure",
        brand: Optional[str] = None,
        model: Optional[str] = None,
        variant: Optional[str] = None,
        language: str = "en",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Chunk]:
        """Cleans and chunks a document, returning a list of Chunk models."""
        cleaned_text = clean_document_text(text)
        chunks = chunk_document(
            doc_id=doc_id,
            text=cleaned_text,
            source=source,
            brand=brand,
            model=model,
            variant=variant,
            language=language,
            metadata=metadata or {},
        )
        return chunks

    def ingest_default_corpus(self) -> List[Chunk]:
        """Ingests all default seed knowledge documents."""
        all_chunks: List[Chunk] = []
        for doc in KNOWLEDGE_DOCUMENTS:
            doc_chunks = self.process_raw_document(
                doc_id=doc["doc_id"],
                text=doc["content"],
                source=doc.get("source", "brochure"),
                brand=doc.get("brand"),
                model=doc.get("model"),
                variant=doc.get("variant"),
                language=doc.get("language", "en"),
                metadata={"title": doc.get("title", doc["doc_id"])},
            )
            all_chunks.extend(doc_chunks)
        return all_chunks

ingestion_pipeline = IngestionPipeline()
