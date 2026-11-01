# =============================================================================
# Multi-stage Dockerfile for GroupDrive Multilingual RAG Car Advisor (@groupdrive/ai-service)
# Production-ready, non-root user, minimal python:3.12-slim footprint with health check
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Dependencies
# -----------------------------------------------------------------------------
FROM python:3.12-slim AS builder

WORKDIR /build

# Install compilation tools for native extensions (numpy, scikit-learn)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY apps/ai-service/requirements.txt .

# Install dependencies into user site-packages
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --user -r requirements.txt

# -----------------------------------------------------------------------------
# Stage 2: Production Runtime
# -----------------------------------------------------------------------------
FROM python:3.12-slim AS runner

WORKDIR /app

# Install curl for docker healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Security: Non-root user
RUN groupadd -g 10002 groupdrive && \
    useradd -u 10002 -g groupdrive -m -s /bin/bash aiuser

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PATH="/home/aiuser/.local/bin:$PATH"
ENV PYTHONPATH="/app"
ENV PORT=8000
ENV HOST=0.0.0.0

# Copy installed python wheels from builder
COPY --from=builder --chown=aiuser:groupdrive /root/.local /home/aiuser/.local

# Copy application code
COPY --chown=aiuser:groupdrive apps/ai-service/app /app/app
COPY --chown=aiuser:groupdrive apps/ai-service/requirements.txt /app/

USER aiuser

EXPOSE 8000

HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
