import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  async getHealth() {
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);
    const memory = process.memoryUsage();

    return {
      status: 'UP',
      service: 'groupdrive-api',
      version: '1.0.0',
      uptime_seconds: uptimeSec,
      timestamp: new Date().toISOString(),
      memory: {
        rss_mb: Math.round(memory.rss / (1024 * 1024)),
        heap_used_mb: Math.round(memory.heapUsed / (1024 * 1024)),
      },
    };
  }

  @Get('live')
  getLiveness(@Res() res: Response) {
    // Process is alive
    return res.status(HttpStatus.OK).json({
      status: 'LIVE',
      timestamp: new Date().toISOString(),
    });
  }

  @Get('ready')
  async getReadiness(@Res() res: Response) {
    let dbStatus = 'CONNECTED';
    try {
      // Fast ping check on database
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      // In standalone memory / fallback mode
      dbStatus = 'IN_MEMORY_FALLBACK';
    }

    const deadLetters = this.notifications.getDeadLetters();
    const queueHealthy = deadLetters.length < 50;

    const isReady = queueHealthy;

    const statusCode = isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(statusCode).json({
      status: isReady ? 'READY' : 'NOT_READY',
      checks: {
        database: dbStatus,
        notification_dlq_backlog: deadLetters.length,
        notification_queue: queueHealthy ? 'HEALTHY' : 'DEGRADED',
      },
      timestamp: new Date().toISOString(),
    });
  }
}
