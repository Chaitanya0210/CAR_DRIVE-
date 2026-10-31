import { Injectable, LoggerService } from '@nestjs/common';
import { getActiveTraceContext } from './tracer';

export interface StructuredLogMessage {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  context?: string;
  traceId: string;
  spanId: string;
  metadata?: Record<string, unknown>;
  error?: string;
  stack?: string;
}

@Injectable()
export class StructuredLogger implements LoggerService {
  private formatLog(
    level: StructuredLogMessage['level'],
    message: any,
    context?: string,
    extra?: Record<string, unknown>,
  ): string {
    const traceCtx = getActiveTraceContext();
    const entry: StructuredLogMessage = {
      timestamp: new Date().toISOString(),
      level,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      context: context || 'Application',
      traceId: traceCtx.traceId,
      spanId: traceCtx.spanId,
      metadata: extra,
    };

    return JSON.stringify(entry);
  }

  log(message: any, context?: string) {
    console.log(this.formatLog('INFO', message, context));
  }

  error(message: any, trace?: string, context?: string) {
    const traceCtx = getActiveTraceContext();
    const entry: StructuredLogMessage = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message: typeof message === 'string' ? message : JSON.stringify(message),
      context: context || 'Application',
      traceId: traceCtx.traceId,
      spanId: traceCtx.spanId,
      stack: trace,
    };
    console.error(JSON.stringify(entry));
  }

  warn(message: any, context?: string) {
    console.warn(this.formatLog('WARN', message, context));
  }

  debug(message: any, context?: string) {
    console.debug(this.formatLog('DEBUG', message, context));
  }

  verbose(message: any, context?: string) {
    console.log(this.formatLog('DEBUG', message, context));
  }
}
