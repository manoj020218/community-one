import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/response';
import { ValidationError } from '../../common/errors/AppError';
import { mcrReceiptDocumentService } from './mcrReceiptDocument.service';
import { mcrReceiptPosterService } from './mcrReceiptPoster.service';
import { mcrReceiptPublicService } from './mcrReceiptPublic.service';

function tokenFrom(req: Request) {
  if (typeof req.query.token !== 'string' || !req.query.token.trim()) throw new ValidationError('token is required');
  return req.query.token;
}

function publicUrls(req: Request) {
  const root = `${req.protocol}://${req.get('host')}/api/mcr/public/receipts`;
  return { verifyBaseUrl: `${root}/verify`, documentBaseUrl: `${root}/document` };
}

export class McrPublicReceiptController {
  async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, (await mcrReceiptPublicService.verifyToken(tokenFrom(req))).summary, 'Receipt verification successful');
    } catch (error) {
      next(error);
    }
  }

  async document(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const urls = publicUrls(req);
      const doc = await mcrReceiptDocumentService.buildPublic(tokenFrom(req), urls.verifyBaseUrl, urls.documentBaseUrl);
      res.type('html').send(doc.html);
    } catch (error) {
      next(error);
    }
  }

  async poster(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const urls = publicUrls(req);
      const poster = await mcrReceiptPosterService.buildPublic(tokenFrom(req), urls.verifyBaseUrl, urls.documentBaseUrl);
      res.type('image/svg+xml').send(poster.svg);
    } catch (error) {
      next(error);
    }
  }
}

export const mcrPublicReceiptController = new McrPublicReceiptController();
