import { randomUUID } from 'crypto';
import { Response } from 'express';
import { env } from '../../config/env';
import { VisitorActorContext } from './visitor.access.service';

export interface VisitorRealtimeEvent {
  id?: string;
  type: string;
  societyId: string;
  gateId?: string;
  flatId?: string;
  data: Record<string, unknown>;
}

interface VisitorConnection {
  id: string;
  context: VisitorActorContext;
  response: Response;
  heartbeat: NodeJS.Timeout;
}

class VisitorRealtimeService {
  private readonly connections = new Map<string, VisitorConnection>();

  register(context: VisitorActorContext, response: Response): string {
    const id = randomUUID();
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    response.write('retry: 5000\n\n');

    const heartbeat = setInterval(() => {
      response.write(`event: heartbeat\ndata: ${JSON.stringify({ connectedAt: new Date().toISOString() })}\n\n`);
    }, env.VISITOR_SSE_HEARTBEAT_MS);

    this.connections.set(id, { id, context, response, heartbeat });
    response.on('close', () => this.remove(id));
    response.on('error', () => this.remove(id));
    return id;
  }

  publish(event: VisitorRealtimeEvent): void {
    const payload = { ...event, id: event.id || randomUUID() };
    for (const connection of this.connections.values()) {
      if (!this.matches(connection.context, event)) continue;
      connection.response.write(`id: ${payload.id}\nevent: ${payload.type}\ndata: ${JSON.stringify(payload.data)}\n\n`);
    }
  }

  getDiagnostics(): { activeConnections: number } {
    return { activeConnections: this.connections.size };
  }

  private remove(id: string): void {
    const connection = this.connections.get(id);
    if (!connection) return;
    clearInterval(connection.heartbeat);
    this.connections.delete(id);
  }

  private matches(context: VisitorActorContext, event: VisitorRealtimeEvent): boolean {
    if (context.societyId !== event.societyId) return false;
    if (context.canViewSociety || context.canOverride) return true;
    if (event.flatId && context.flatId === event.flatId) return true;
    return !!event.gateId && context.gateIds.includes(event.gateId);
  }
}

export const visitorRealtimeService = new VisitorRealtimeService();
