"""
Base interfaces and dataclasses for the provider-agnostic Model Gateway.
Supports both synchronous and asynchronous execution.
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class LLMRequest(BaseModel):
    prompt: str
    system_prompt: Optional[str] = None
    temperature: float = 0.2
    max_tokens: int = 800
    timeout_seconds: float = 8.0
    language: str = "en"
    metadata: Dict[str, Any] = Field(default_factory=dict)

class LLMResponse(BaseModel):
    text: str
    provider: str
    model: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    latency_ms: float
    cost_usd: float
    cost_inr: float
    is_fallback: bool = False
    error: Optional[str] = None

class BaseLLMProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def generate(self, request: LLMRequest) -> LLMResponse:
        pass

    async def generate_async(self, request: LLMRequest) -> LLMResponse:
        return self.generate(request)
