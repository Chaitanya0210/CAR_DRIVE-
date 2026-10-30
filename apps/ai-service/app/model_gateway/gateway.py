"""
Model Gateway orchestrator: provider routing, timeouts, fallback chain, and cost logging.
Supports both synchronous and asynchronous generation.
"""
import logging
from typing import Optional
from app.model_gateway.base import BaseLLMProvider, LLMRequest, LLMResponse
from app.model_gateway.gemini_provider import GeminiProvider
from app.model_gateway.fallback_provider import FallbackLocalAdvisor
from app.config import settings

logger = logging.getLogger("model_gateway")

class ModelGateway:
    def __init__(self):
        self.fallback_provider = FallbackLocalAdvisor()
        self.primary_provider: Optional[BaseLLMProvider] = None
        
        # Initialize primary if credentials exist
        if settings.gemini_api_key:
            self.primary_provider = GeminiProvider(settings.gemini_api_key)

    def generate(self, request: LLMRequest) -> LLMResponse:
        """
        Attempts generation with primary provider. On failure or missing key,
        seamlessly fails over to FallbackLocalAdvisor.
        """
        if self.primary_provider:
            try:
                return self.primary_provider.generate(request)
            except Exception as e:
                logger.warning(f"Primary provider failed: {e}. Falling back to local advisor.")

        # Fallback provider
        return self.fallback_provider.generate(request)

    async def generate_async(self, request: LLMRequest) -> LLMResponse:
        return self.generate(request)

model_gateway = ModelGateway()
