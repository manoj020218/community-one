import nodemailer from 'nodemailer';
import { ValidationError } from '../../common/errors/AppError';
import { CommunicationSettings, ICommunicationSettingsDocument } from './communication.model';

export interface SmtpSettingsDto {
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  fromEmail?: string;
  fromName?: string;
  enabled?: boolean;
}

const MASKED_PASSWORD = '••••••••';

export class CommunicationService {
  async getSettings(societyId: string): Promise<ICommunicationSettingsDocument> {
    let settings = await CommunicationSettings.findOne({ societyId });
    if (!settings) settings = await CommunicationSettings.create({ societyId });
    return settings;
  }

  /** Returns settings safe to send to the client — SMTP password is masked, never returned in plaintext. */
  async getSettingsForClient(societyId: string): Promise<Record<string, unknown>> {
    const settings = await this.getSettings(societyId);
    const plain = settings.toObject();
    return {
      ...plain,
      smtp: { ...plain.smtp, password: plain.smtp?.password ? MASKED_PASSWORD : undefined },
    };
  }

  async updateSmtp(societyId: string, dto: SmtpSettingsDto): Promise<Record<string, unknown>> {
    await this.getSettings(societyId); // ensures a document exists to $set against
    const next = { ...dto };
    // Keep the existing password if the client sends back the masked placeholder unchanged.
    if (!next.password || next.password === MASKED_PASSWORD) delete next.password;

    await CommunicationSettings.findOneAndUpdate(
      { societyId },
      { $set: Object.fromEntries(Object.entries(next).map(([key, value]) => [`smtp.${key}`, value])) },
      { upsert: true }
    );
    return this.getSettingsForClient(societyId);
  }

  async sendTestEmail(societyId: string, toEmail: string): Promise<void> {
    const settings = await this.getSettings(societyId);
    const { smtp } = settings;
    if (!smtp.host || !smtp.port || !smtp.username || !smtp.password || !smtp.fromEmail) {
      throw new ValidationError('SMTP settings are incomplete — host, port, username, password, and from-email are required');
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.username, pass: smtp.password },
    });

    await transporter.sendMail({
      from: smtp.fromName ? `"${smtp.fromName}" <${smtp.fromEmail}>` : smtp.fromEmail,
      to: toEmail,
      subject: 'Test email from Jenix Society One',
      text: 'This is a test email confirming your SMTP settings are working correctly.',
    });
  }
}

export const communicationService = new CommunicationService();
