import { NextFunction, Response } from 'express';
import QRCode from 'qrcode';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess } from '../../common/utils/response';
import { resolveActorSocietyId } from '../../common/utils/authScope';
import { ValidationError } from '../../common/errors/AppError';
import { communicationService } from './communication.service';
import { whatsAppService } from './whatsapp.service';

/** Baileys hands back a raw QR payload string — encode it as a PNG data URL for the browser. */
async function withQrDataUrl(result: { status: string; qr?: string; phoneNumber?: string }) {
  if (!result.qr) return result;
  const qrDataUrl = await QRCode.toDataURL(result.qr);
  return { status: result.status, phoneNumber: result.phoneNumber, qrDataUrl };
}

export class CommunicationController {
  async getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = resolveActorSocietyId(req.user!, req.query.societyId as string);
      sendSuccess(res, await communicationService.getSettingsForClient(societyId), 'Communication settings retrieved');
    } catch (error) { next(error); }
  }

  async updateSmtp(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = resolveActorSocietyId(req.user!, req.body.societyId);
      sendSuccess(res, await communicationService.updateSmtp(societyId, req.body), 'SMTP settings updated');
    } catch (error) { next(error); }
  }

  async testSmtp(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = resolveActorSocietyId(req.user!, req.body.societyId);
      if (!req.body.toEmail) throw new ValidationError('toEmail is required');
      await communicationService.sendTestEmail(societyId, req.body.toEmail);
      sendSuccess(res, null, 'Test email sent');
    } catch (error) { next(error); }
  }

  async connectWhatsapp(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = resolveActorSocietyId(req.user!, req.body.societyId);
      const result = await whatsAppService.connect(societyId);
      sendSuccess(res, await withQrDataUrl(result), 'WhatsApp connection started');
    } catch (error) { next(error); }
  }

  async getWhatsappStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = resolveActorSocietyId(req.user!, req.query.societyId as string);
      const result = await whatsAppService.getStatus(societyId);
      sendSuccess(res, await withQrDataUrl(result), 'WhatsApp status retrieved');
    } catch (error) { next(error); }
  }

  async disconnectWhatsapp(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = resolveActorSocietyId(req.user!, req.body.societyId);
      await whatsAppService.disconnect(societyId);
      sendSuccess(res, null, 'WhatsApp disconnected');
    } catch (error) { next(error); }
  }
}

export const communicationController = new CommunicationController();
