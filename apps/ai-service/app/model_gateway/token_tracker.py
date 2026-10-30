"""
Token tracking and cost accounting for LLM requests in USD and INR.
"""
import time
from typing import List, Dict, Any
from pydantic import BaseModel
from app.config import settings

class UsageRecord(BaseModel):
    timestamp: float
    provider: str
    model: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    latency_ms: float
    cost_usd: float
    cost_inr: float

class TokenTracker:
    def __init__(self):
        self.records: List[UsageRecord] = []

    def count_tokens(self, text: str) -> int:
        """Fast character-based token approximation (1 token ~= 4 chars)."""
        if not text:
            return 0
        return max(1, int(len(text) / 4))

    def calculate_cost(self, input_tokens: int, output_tokens: int) -> Dict[str, float]:
        cost_usd = (
            (input_tokens / 1000.0) * settings.input_token_cost_usd_per_1k +
            (output_tokens / 1000.0) * settings.output_token_cost_usd_per_1k
        )
        cost_inr = cost_usd * settings.usd_to_inr_rate
        return {
            "cost_usd": round(cost_usd, 6),
            "cost_inr": round(cost_inr, 4),
        }

    def record_usage(
        self,
        provider: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        latency_ms: float,
    ) -> UsageRecord:
        costs = self.calculate_cost(input_tokens, output_tokens)
        record = UsageRecord(
            timestamp=time.time(),
            provider=provider,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            latency_ms=round(latency_ms, 2),
            cost_usd=costs["cost_usd"],
            cost_inr=costs["cost_inr"],
        )
        self.records.append(record)
        return record

    def get_summary(self) -> Dict[str, Any]:
        total_requests = len(self.records)
        total_tokens = sum(r.total_tokens for r in self.records)
        total_cost_usd = sum(r.cost_usd for r in self.records)
        total_cost_inr = sum(r.cost_inr for r in self.records)
        avg_latency = sum(r.latency_ms for r in self.records) / total_requests if total_requests > 0 else 0.0

        return {
            "total_requests": total_requests,
            "total_tokens": total_tokens,
            "total_cost_usd": round(total_cost_usd, 4),
            "total_cost_inr": round(total_cost_inr, 2),
            "avg_latency_ms": round(avg_latency, 2),
        }

token_tracker = TokenTracker()
