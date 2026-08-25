import { Request, Response } from 'express';
import { getDatabaseStatus } from '../../config/database';
import { env } from '../../config/env';
import { mcrDemandAutomationWorker } from '../mcr/mcrDemandAutomation.worker';
import { mcrLateFeeWorker } from '../mcr/mcrLateFee.worker';
import { mcrReminderWorker } from '../mcr/mcrReminder.worker';
import { pushProviderService } from '../notification/pushProvider.service';
import { samaScheduledSyncWorker } from '../sama/samaScheduledSync.worker';
import { visitorExpiryWorker } from '../visitor/visitor.expiry.worker';
import { patrolRoundWorker } from '../guardPatrol/patrolRound.worker';
import { visitorRealtimeService } from '../visitor/visitor.realtime.service';
import { HealthLog } from './health.model';

export class HealthController {
  async check(_req: Request, res: Response): Promise<void> {
    const dbStatus = getDatabaseStatus();
    const uptime = process.uptime();
    const status = dbStatus.status === 'connected' ? 'ok' : 'degraded';
    const demandWorkerStatus = mcrDemandAutomationWorker.getStatus();
    const pushHealth = pushProviderService.getProvider().getHealth();
    const lateFeeWorkerStatus = mcrLateFeeWorker.getStatus();
    const mcrWorkerStatus = mcrReminderWorker.getStatus();
    const samaWorkerStatus = samaScheduledSyncWorker.getStatus();
    const workerStatus = visitorExpiryWorker.getStatus();
    const patrolWorkerStatus = patrolRoundWorker.getStatus();
    const realtimeStatus = visitorRealtimeService.getDiagnostics();
    const anyWorkerEnabled = workerStatus.enabled || mcrWorkerStatus.enabled || lateFeeWorkerStatus.enabled || demandWorkerStatus.enabled || samaWorkerStatus.enabled;
    const anyWorkerRunning = workerStatus.running || mcrWorkerStatus.running || lateFeeWorkerStatus.running || demandWorkerStatus.running || samaWorkerStatus.running;

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
        queueStatus: anyWorkerRunning ? 'running' : anyWorkerEnabled ? 'stopped' : 'disabled',
        visitorRealtimeConnections: realtimeStatus.activeConnections,
        mcrDemandWorker: demandWorkerStatus,
        mcrLateFeeWorker: lateFeeWorkerStatus,
        mcrReminderWorker: mcrWorkerStatus,
        samaSyncWorker: samaWorkerStatus,
        visitorExpiryWorker: workerStatus,
        patrolRoundWorker: patrolWorkerStatus,
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
