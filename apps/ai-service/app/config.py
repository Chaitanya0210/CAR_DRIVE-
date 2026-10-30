"""
Configuration settings for GroupDrive AI Service
"""
import os
from pydantic import BaseModel, Field

class Settings(BaseModel):
    app_name: str = "GroupDrive AI Service"
    version: str = "0.1.0"
    environment: str = os.getenv("ENV", "development")
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    
    # Retrieval & Vector Store
    embedding_model_name: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    vector_dimension: int = 384
    min_retrieval_confidence: float = 0.35
    max_retrieval_chunks: int = 4
    bm25_weight: float = 0.45
    vector_weight: float = 0.55
    
    # Model Gateway
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    default_provider: str = os.getenv("DEFAULT_PROVIDER", "fallback")
    gateway_timeout_seconds: float = 8.0
    
    # Token Pricing (USD per 1k tokens)
    input_token_cost_usd_per_1k: float = 0.00015
    output_token_cost_usd_per_1k: float = 0.00060
    usd_to_inr_rate: float = 84.50
    
    # Guardrails
    enable_pii_redaction: bool = True
    enable_injection_filter: bool = True
    toxicity_threshold: float = 0.65
    spam_threshold: float = 0.60
    
    # Eval Benchmarks
    eval_min_faithfulness: float = 0.85
    eval_min_relevance: float = 0.85
    eval_min_precision: float = 0.80

settings = Settings()
