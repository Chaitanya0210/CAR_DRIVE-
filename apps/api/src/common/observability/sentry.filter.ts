import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { getActiveTraceContext } from './tracer';

export interface SentryCapturedEvent {
  eventId: string;
  timestamp: string;
  message: string;
  stack?: string;
  statusCode: number;
  route: string;
  method: string;
  traceId: string;
  spanId: string;
  tags: Record<string, string>;
  sanitizedHeaders: Record<string, string>;
}

const SENTRY_EVENTS: SentryCapturedEvent[] = [];

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('SentryHook');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceCtx = getActiveTraceContext();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof Error ? exception.message : 'Internal server error';

    const eventId = `sentry_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // PII Redaction for request headers before reporting to Sentry
    const sanitizedHeaders: Record<string, string> = {};
    if (request?.headers) {
      for (const [key, val] of Object.entries(request.headers)) {
        if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('cookie')) {
          sanitizedHeaders[key] = '[REDACTED_AUTH_SECRET]';
        } else {
          sanitizedHeaders[key] = String(val);
        }
      }
    }

    const sentryEvent: SentryCapturedEvent = {
      eventId,
      timestamp: new Date().toISOString(),
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
      statusCode: status,
      route: request?.url || 'unknown_route',
      method: request?.method || 'GET',
      traceId: traceCtx.traceId,
      spanId: traceCtx.spanId,
      tags: {
        environment: process.env.NODE_ENV || 'production',
        service: 'groupdrive-api',
      },
      sanitizedHeaders,
    };

    SENTRY_EVENTS.push(sentryEvent);
    this.logger.error(
      `[Sentry Captured Exception] ID: ${eventId} - ${message} on ${sentryEvent.method} ${sentryEvent.route}`,
    );

    if (response && typeof response.status === 'function') {
      response.status(status).json({
        statusCode: status,
        message,
        timestamp: sentryEvent.timestamp,
        traceId: traceCtx.traceId,
        sentryEventId: eventId,
      });
    }
  }

  public static getCapturedEvents(): SentryCapturedEvent[] {
    return [...SENTRY_EVENTS];
  }

  public static clear(): void {
    SENTRY_EVENTS.length = 0;
  }
}
