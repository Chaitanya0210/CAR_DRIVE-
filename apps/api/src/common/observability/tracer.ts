import crypto from 'node:crypto';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
}

// Thread-local or async context storage simulation for distributed tracing
let currentTraceContext: TraceContext | null = null;

export function generateTraceId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function generateSpanId(): string {
  return crypto.randomBytes(8).toString('hex');
}

export function getActiveTraceContext(): TraceContext {
  if (!currentTraceContext) {
    currentTraceContext = {
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      sampled: true,
    };
  }
  return currentTraceContext;
}

export function setActiveTraceContext(ctx: TraceContext | null): void {
  currentTraceContext = ctx;
}

export interface Span {
  name: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  attributes: Record<string, string | number | boolean>;
  status: 'OK' | 'ERROR';
  error?: string;
}

const COMPLETED_SPANS: Span[] = [];

/**
 * OpenTelemetry Span Wrapper
 * Traces an asynchronous operation, records latency, attaches attributes, and handles errors.
 */
export async function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean> = {},
  operation: (span: Span) => Promise<T>,
): Promise<T> {
  const currentCtx = getActiveTraceContext();
  const span: Span = {
    name,
    traceId: currentCtx.traceId,
    spanId: generateSpanId(),
    parentSpanId: currentCtx.spanId,
    startTime: Date.now(),
    attributes: { ...attributes },
    status: 'OK',
  };

  const prevContext = currentTraceContext;
  currentTraceContext = {
    traceId: span.traceId,
    spanId: span.spanId,
    parentSpanId: span.parentSpanId,
    sampled: true,
  };

  try {
    const result = await operation(span);
    span.endTime = Date.now();
    span.durationMs = span.endTime - span.startTime;
    COMPLETED_SPANS.push(span);
    return result;
  } catch (err: any) {
    span.endTime = Date.now();
    span.durationMs = span.endTime - span.startTime;
    span.status = 'ERROR';
    span.error = err.message || 'Span execution error';
    COMPLETED_SPANS.push(span);
    throw err;
  } finally {
    currentTraceContext = prevContext;
  }
}

export function getRecordedSpans(): Span[] {
  return [...COMPLETED_SPANS];
}

export function clearSpans(): void {
  COMPLETED_SPANS.length = 0;
}
