"""
Google GenAI (Gemini) provider integration.
"""
import time
import os
from typing import Optional
from app.model_gateway.base import BaseLLMProvider, LLMRequest, LLMResponse
from app.model_gateway.token_tracker import token_tracker
from app.config import settings

class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.gemini_api_key or os.getenv("GEMINI_API_KEY", "")
        self._client = None
        self._initialized = False

    @property
    def name(self) -> str:
        return "gemini-2.0-flash"

    def _init_client(self):
        if self._initialized:
            return
        self._initialized = True
        if self.api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except Exception:
                self._client = None

    async def generate(self, request: LLMRequest) -> LLMResponse:
        self._init_client()
        if not self._client:
            raise RuntimeError("Gemini client not initialized or API key missing")

        start_time = time.time()
        input_tokens = token_tracker.count_tokens(request.prompt + (request.system_prompt or ""))

        # Run via google-genai
        response = self._client.models.generate_content(
            model="gemini-2.5-flash",
            contents=request.prompt,
            config={
                "system_instruction": request.system_prompt,
                "temperature": request.temperature,
                "max_output_tokens": request.max_tokens,
            }
        )

        text = response.text or ""
        output_tokens = token_tracker.count_tokens(text)
        latency_ms = (time.time() - start_time) * 1000.0

        record = token_tracker.record_usage(
            provider=self.name,
            model="gemini-2.5-flash",
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=latency_ms,
        )

        return LLMResponse(
            text=text,
            provider=self.name,
            model="gemini-2.5-flash",
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            latency_ms=latency_ms,
            cost_usd=record.cost_usd,
            cost_inr=record.cost_inr,
            is_fallback=False,
        )
