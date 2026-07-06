import { Request, Response } from 'express';
import { getDatabaseStatus } from '../../config/database';
import { env } from '../../config/env';
import { HealthLog } from './health.model';

export class HealthController {
  async check(_req: Request, res: Response): Promise<void> {
    const dbStatus = getDatabaseStatus();
    const uptime = process.uptime();
    const status = dbStatus.status === 'connected' ? 'ok' : 'degraded';

    res.status(status === 'ok' ? 200 : 503).json({
      success: true,
      data: {
        apiStatus: 'running',
        databaseStatus: dbStatus.status,
        timestamp: new Date().toISOString(),
        version: env.APP_VERSION,
        uptime: Math.floor(uptime),
        environment: env.NODE_ENV,
        // Placeholders for future health checks:
        mqttStatus: 'not_configured',
        fcmStatus: 'not_configured',
        queueStatus: 'not_configured',
      },
      message: status === 'ok' ? 'System healthy' : 'System degraded',
    });
  }

  async getRecentLogs(_req: Request, res: Response): Promise<void> {
    try {
      const logs = await HealthLog.find().sort({ createdAt: -1 }).limit(50);
      res.json({ success: true, data: logs });
    } catch {
      res.json({ success: true, data: [] });
    }
  }
}

export const healthController = new HealthController();
