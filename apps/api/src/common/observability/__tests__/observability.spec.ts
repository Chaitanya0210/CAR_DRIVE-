import { describe, it, expect, beforeEach } from 'vitest';
import { withSpan, getRecordedSpans, clearSpans } from '../tracer';
import { StructuredLogger } from '../structured-logger.service';
import { SentryExceptionFilter } from '../sentry.filter';
import { HealthController } from '../../health/health.controller';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('Observability & Health Monitoring Suite', () => {
  beforeEach(() => {
    clearSpans();
    SentryExceptionFilter.clear();
  });

  describe('OpenTelemetry Tracing', () => {
    it('creates child spans and propagates traceId across operations', async () => {
      await withSpan('parent-operation', { domain: 'reverse-auction' }, async () => {
        await withSpan('child-operation', { dealerId: 'dealer-pune' }, async () => {
          return 'ok';
        });
      });

      const spans = getRecordedSpans();
      expect(spans).toHaveLength(2);

      const childSpan = spans[0];
      const parentSpan = spans[1];

      expect(childSpan.name).toBe('child-operation');
      expect(parentSpan.name).toBe('parent-operation');
      expect(childSpan.traceId).toBe(parentSpan.traceId); // Shared trace ID
      expect(childSpan.parentSpanId).toBe(parentSpan.spanId); // Hierarchical link
      expect(childSpan.durationMs).toBeGreaterThanOrEqual(0);
      expect(childSpan.status).toBe('OK');
    });

    it('records error status and error message on failed spans', async () => {
      await expect(
        withSpan('failing-operation', {}, async () => {
          throw new Error('Database connection failed');
        }),
      ).rejects.toThrow('Database connection failed');

      const spans = getRecordedSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0].status).toBe('ERROR');
      expect(spans[0].error).toContain('Database connection failed');
    });
  });

  describe('Structured JSON Logging', () => {
    it('emits structured JSON with trace correlation metadata', () => {
      const logger = new StructuredLogger();
      let capturedLog = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        capturedLog = msg;
      };

      try {
        logger.log('Buyer group created for Scorpio-N', 'GroupsService');
        const parsed = JSON.parse(capturedLog);
        expect(parsed.level).toBe('INFO');
        expect(parsed.message).toContain('Buyer group created');
        expect(parsed.context).toBe('GroupsService');
        expect(parsed.traceId).toBeDefined();
        expect(parsed.spanId).toBeDefined();
        expect(parsed.timestamp).toBeDefined();
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('Sentry Error Hook & PII Redaction', () => {
    it('captures unhandled exceptions and redacts sensitive authorization/cookie headers', () => {
      const filter = new SentryExceptionFilter();

      const mockResponse = {
        status: (code: number) => ({
          json: (body: any) => ({ code, body }),
        }),
      };

      const mockRequest = {
        url: '/api/v1/quotes/submit',
        method: 'POST',
        headers: {
          authorization: 'Bearer secret_jwt_token_here',
          cookie: 'session_id=confidential_session_cookie',
          'user-agent': 'Chrome/120',
        },
      };

      const mockHost = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as any;

      filter.catch(new HttpException('Invalid quote margin', HttpStatus.BAD_REQUEST), mockHost);

      const events = SentryExceptionFilter.getCapturedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].statusCode).toBe(400);
      expect(events[0].message).toBe('Invalid quote margin');
      expect(events[0].sanitizedHeaders.authorization).toBe('[REDACTED_AUTH_SECRET]');
      expect(events[0].sanitizedHeaders.cookie).toBe('[REDACTED_AUTH_SECRET]');
      expect(events[0].sanitizedHeaders['user-agent']).toBe('Chrome/120');
    });
  });

  describe('Health Probes', () => {
    it('/health returns service status, uptime, and memory usage', async () => {
      const mockPrisma: any = { $queryRaw: async () => [{ 1: 1 }] };
      const mockNotifications: any = { getDeadLetters: () => [] };
      const controller = new HealthController(mockPrisma, mockNotifications);

      const res = await controller.getHealth();
      expect(res.status).toBe('UP');
      expect(res.service).toBe('groupdrive-api');
      expect(res.uptime_seconds).toBeGreaterThanOrEqual(0);
      expect(res.memory.heap_used_mb).toBeGreaterThan(0);
    });

    it('/health/live returns 200 OK immediately for liveness probe', () => {
      const mockPrisma: any = {};
      const mockNotifications: any = {};
      const controller = new HealthController(mockPrisma, mockNotifications);

      let statusCode = 0;
      let body: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              body = data;
            },
          };
        },
      };

      controller.getLiveness(res);
      expect(statusCode).toBe(200);
      expect(body.status).toBe('LIVE');
    });

    it('/health/ready verifies database and notification queue readiness', async () => {
      const mockPrisma: any = { $queryRaw: async () => [{ 1: 1 }] };
      const mockNotifications: any = { getDeadLetters: () => [] };
      const controller = new HealthController(mockPrisma, mockNotifications);

      let statusCode = 0;
      let body: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              body = data;
            },
          };
        },
      };

      await controller.getReadiness(res);
      expect(statusCode).toBe(200);
      expect(body.status).toBe('READY');
      expect(body.checks.database).toBe('CONNECTED');
      expect(body.checks.notification_queue).toBe('HEALTHY');
    });
  });
});
