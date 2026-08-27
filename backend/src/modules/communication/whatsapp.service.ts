import fs from 'fs';
import path from 'path';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  WASocket,
  WAMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { logger } from '../../common/utils/logger';
import { CommunicationSettings } from './communication.model';

const SESSIONS_ROOT = path.join(process.cwd(), 'whatsapp-sessions');
const waLogger = pino({ level: 'silent' });

interface SocietySession {
  sock: WASocket;
  status: 'CONNECTING' | 'CONNECTED';
  qr?: string;
  phoneNumber?: string;
}

export interface InboundImagePayload {
  fromMobile: string;
  quotedMessageId?: string;
  buffer: Buffer;
  mimeType: string;
  caption?: string;
}

export type InboundImageHandler = (societyId: string, payload: InboundImagePayload) => Promise<void>;

function sessionDir(societyId: string): string {
  return path.join(SESSIONS_ROOT, societyId);
}

function toJid(phone: string): string {
  const clean = phone.replace(/[^0-9]/g, '');
  const normalized = clean.startsWith('0') ? '91' + clean.slice(1) : clean;
  return `${normalized}@s.whatsapp.net`;
}

function fromJid(jid: string): string {
  return jid.split('@')[0].split(':')[0];
}

export class WhatsAppService {
  private sessions = new Map<string, SocietySession>();
  private inboundImageHandlers: InboundImageHandler[] = [];

  /** Registered by feature modules (e.g. MCR) at server boot — keeps this transport-only
   * module decoupled from any specific module's business logic. */
  onInboundImage(handler: InboundImageHandler): void {
    this.inboundImageHandlers.push(handler);
  }

  /** Reconnects any society whose settings say it was previously linked — call once on server boot. */
  async reconnectAll(): Promise<void> {
    const linked = await CommunicationSettings.find({ 'whatsapp.status': { $ne: 'DISCONNECTED' } }).select('societyId');
    for (const doc of linked) {
      this.connect(doc.societyId.toString()).catch((err) =>
        logger.warn('WhatsApp reconnect failed on boot', { societyId: doc.societyId.toString(), err: err?.message })
      );
    }
  }

  async connect(societyId: string): Promise<{ status: string; qr?: string }> {
    const existing = this.sessions.get(societyId);
    if (existing) return { status: existing.status, qr: existing.qr };

    if (!fs.existsSync(sessionDir(societyId))) fs.mkdirSync(sessionDir(societyId), { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir(societyId));
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({ version, auth: state, logger: waLogger });
    const session: SocietySession = { sock, status: 'CONNECTING' };
    this.sessions.set(societyId, session);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        session.qr = qr;
        session.status = 'CONNECTING';
        await this.updateStatus(societyId, 'CONNECTING');
      }
      if (connection === 'open') {
        session.status = 'CONNECTED';
        session.qr = undefined;
        const phoneNumber = sock.user?.id?.split(':')[0];
        session.phoneNumber = phoneNumber;
        await this.updateStatus(societyId, 'CONNECTED', phoneNumber);
        logger.info('WhatsApp connected', { societyId, phoneNumber });
      } else if (connection === 'close') {
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        this.sessions.delete(societyId);
        if (loggedOut) {
          await this.updateStatus(societyId, 'DISCONNECTED');
          logger.info('WhatsApp logged out', { societyId });
        } else {
          logger.warn('WhatsApp disconnected, reconnecting', { societyId, code, reason: lastDisconnect?.error?.message });
          setTimeout(() => this.connect(societyId).catch(() => undefined), 5000);
        }
      }
    });

    sock.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (msg.key.fromMe || !msg.message) continue;
        this.handleInboundMessage(societyId, sock, msg).catch((err) =>
          logger.warn('WhatsApp inbound message handling failed', { societyId, err: err?.message })
        );
      }
    });

    return { status: 'CONNECTING' };
  }

  private async handleInboundMessage(societyId: string, sock: WASocket, msg: WAMessage): Promise<void> {
    const imageMessage = msg.message?.imageMessage;
    if (!imageMessage || !this.inboundImageHandlers.length) return;

    const fromMobile = fromJid(msg.key.remoteJid || '');
    if (!fromMobile) return;

    const buffer = (await downloadMediaMessage(msg, 'buffer', {}, { logger: waLogger, reuploadRequest: sock.updateMediaMessage })) as Buffer;
    const payload = {
      fromMobile,
      quotedMessageId: imageMessage.contextInfo?.stanzaId || undefined,
      buffer,
      mimeType: imageMessage.mimetype || 'image/jpeg',
      caption: imageMessage.caption || undefined,
    };

    for (const handler of this.inboundImageHandlers) {
      await handler(societyId, payload).catch((err) =>
        logger.warn('WhatsApp inbound image handler threw', { societyId, err: err?.message })
      );
    }
  }

  async getStatus(societyId: string): Promise<{ status: string; qr?: string; phoneNumber?: string }> {
    const live = this.sessions.get(societyId);
    if (live) return { status: live.status, qr: live.qr, phoneNumber: live.phoneNumber };
    const settings = await CommunicationSettings.findOne({ societyId });
    return { status: settings?.whatsapp.status || 'DISCONNECTED', phoneNumber: settings?.whatsapp.phoneNumber };
  }

  async disconnect(societyId: string): Promise<void> {
    const session = this.sessions.get(societyId);
    if (session) {
      try {
        await session.sock.logout();
      } catch {
        // already disconnected — proceed to clean up regardless
      }
      this.sessions.delete(societyId);
    }
    fs.rmSync(sessionDir(societyId), { recursive: true, force: true });
    await this.updateStatus(societyId, 'DISCONNECTED');
  }

  async sendMessage(societyId: string, phone: string, text: string): Promise<{ id?: string }> {
    const session = this.sessions.get(societyId);
    if (!session || session.status !== 'CONNECTED') {
      throw new Error('WhatsApp is not connected for this society');
    }
    const result = await session.sock.sendMessage(toJid(phone), { text });
    return { id: result?.key.id || undefined };
  }

  private async updateStatus(societyId: string, status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED', phoneNumber?: string): Promise<void> {
    const update: Record<string, unknown> = { 'whatsapp.status': status };
    if (phoneNumber) update['whatsapp.phoneNumber'] = phoneNumber;
    if (status === 'CONNECTED') {
      update['whatsapp.lastConnectedAt'] = new Date();
      update['whatsapp.linkedAt'] = new Date();
    }
    await CommunicationSettings.findOneAndUpdate({ societyId }, { $set: update }, { upsert: true });
  }
}

export const whatsAppService = new WhatsAppService();
