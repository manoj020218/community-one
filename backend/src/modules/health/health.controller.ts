import { Request, Response } from 'express';
import { getDatabaseStatus } from '../../config/database';
import { env } from '../../config/env';
import { pushProviderService } from '../notification/pushProvider.service';
import { visitorExpiryWorker } from '../visitor/visitor.expiry.worker';
import { visitorRealtimeService } from '../visitor/visitor.realtime.service';
import { HealthLog } from './health.model';

export class HealthController {
  async check(_req: Request, res: Response): Promise<void> {
    const dbStatus = getDatabaseStatus();
    const uptime = process.uptime();
    const status = dbStatus.status === 'connected' ? 'ok' : 'degraded';
    const pushHealth = pushProviderService.getProvider().getHealth();
    const workerStatus = visitorExpiryWorker.getStatus();
    const realtimeStatus = visitorRealtimeService.getDiagnostics();

    res.status(status === 'ok' ? 200 : 503).json({
      success: true,
      data: {
        apiStatus: 'running',
        databaseStatus: dbStatus.status,
        timestamp: new Date().toISOString(),
        version: env.APP_VERSION,
        uptime: Math.floor(uptime),
        environment: env.NODE_ENV,
        mqttStatus: 'not_configured',
        fcmStatus: pushHealth.status,
        queueStatus: workerStatus.enabled ? (workerStatus.running ? 'running' : 'stopped') : 'disabled',
        visitorRealtimeConnections: realtimeStatus.activeConnections,
        visitorExpiryWorker: workerStatus,
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
