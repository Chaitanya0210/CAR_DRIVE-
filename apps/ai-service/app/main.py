"""
FastAPI application for GroupDrive Multilingual RAG Car Advisor & NLP Engine.
"""
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from app.advisor import advisor_service, AdvisorRequest, AdvisorResponse
from app.nlp.hinglish_extractor import hinglish_extractor, ExtractedEntities
from app.nlp.quote_parser import quote_parser, ParsedQuoteSchema
from app.nlp.toxicity_classifier import toxicity_classifier, ReviewClassificationResult
from app.eval.run_eval import run_evaluation
from app.config import settings

app = FastAPI(
    title=settings.app_name,
    description="Multilingual RAG Car Advisor, Reverse-Auction Guidance, and NLP Engine for GroupDrive",
    version=settings.version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    """Initializes knowledge base and vector retriever on startup."""
    advisor_service.initialize()

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "groupdrive-ai-service",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.version,
    }

@app.get("/")
def read_root():
    return {
        "message": "GroupDrive Multilingual RAG Car Advisor operational",
        "endpoints": [
            "/advisor/chat",
            "/nlp/extract-intent",
            "/nlp/parse-quote",
            "/nlp/classify-review",
            "/eval/summary",
        ],
    }

@app.post("/advisor/chat", response_model=AdvisorResponse)
def advisor_chat(request: AdvisorRequest):
    """
    Multilingual RAG Car Advisor endpoint.
    Handles Hindi, Marathi, Hinglish, and English queries with hybrid retrieval,
    strict guardrails, PII masking, and human handoff routing.
    """
    try:
        response = advisor_service.advise(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Advisor processing error: {str(e)}")

@app.post("/nlp/extract-intent", response_model=ExtractedEntities)
def extract_intent(payload: Dict[str, str] = Body(...)):
    """Extracts buyer intent, budget, fuel type, body type, and delivery zone from query."""
    query = payload.get("query", "")
    if not query:
        raise HTTPException(status_code=400, detail="Query string required")
    return hinglish_extractor.extract(query)

@app.post("/nlp/parse-quote", response_model=ParsedQuoteSchema)
def parse_quote(payload: Dict[str, str] = Body(...)):
    """
    Parses dealer quote PDF text or email into GroupDrive Quote schema.
    Mandatory human confirmation flag is attached.
    """
    text = payload.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="Quote text content required")
    return quote_parser.parse_quote_text(text)

@app.post("/nlp/classify-review", response_model=ReviewClassificationResult)
def classify_review(payload: Dict[str, str] = Body(...)):
    """Classifies user or dealer review for abusive language, hate speech, and spam."""
    text = payload.get("text", "")
    return toxicity_classifier.classify(text)

@app.get("/eval/summary")
def get_eval_summary():
    """Returns the latest 50-question golden evaluation benchmark report."""
    summary = run_evaluation()
    return summary
