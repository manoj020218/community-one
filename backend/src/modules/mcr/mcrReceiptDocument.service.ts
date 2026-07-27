import crypto from 'crypto';
import QRCode from 'qrcode';
import { Flat } from '../flat/flat.model';
import { Society } from '../society/society.model';
import { mcrReceiptPublicService } from './mcrReceiptPublic.service';
import { mcrReceiptQueryService } from './mcrReceiptQuery.service';
import { IMcrReceiptDocument } from './mcrReceipt.model';

function money(value: number) {
  return `INR ${(value / 100).toFixed(2)}`;
}

function stamp(value: Date) {
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export class McrReceiptDocumentService {
  async buildById(societyId: string, receiptId: string, verifyBaseUrl: string, publicDocumentBaseUrl: string) {
    const receipt = await mcrReceiptQueryService.findById(societyId, receiptId);
    return this.build(receipt, verifyBaseUrl, publicDocumentBaseUrl);
  }

  async buildPublic(token: string, verifyBaseUrl: string, publicDocumentBaseUrl: string) {
    const { receipt } = await mcrReceiptPublicService.verifyToken(token);
    return this.build(receipt, verifyBaseUrl, publicDocumentBaseUrl);
  }

  private async build(receipt: IMcrReceiptDocument, verifyBaseUrl: string, publicDocumentBaseUrl: string) {
    const [society, flat, share] = await Promise.all([
      Society.findById(receipt.societyId).select('name address city state pincode'),
      Flat.findById(receipt.flatId).select('flatNo'),
      mcrReceiptPublicService.buildShareInfo(receipt, verifyBaseUrl, publicDocumentBaseUrl),
    ]);
    const qrDataUrl = share?.verificationUrl ? await QRCode.toDataURL(share.verificationUrl) : undefined;
    const rows = receipt.allocationSnapshot.map((item) => `<tr><td>${item.demandNumber}</td><td class="right">${money(item.allocatedAmountPaise)}</td></tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${receipt.receiptNumber}</title><style>
body{font-family:Segoe UI,Arial,sans-serif;color:#1f2937;padding:24px;max-width:760px;margin:auto}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.card{border:1px solid #d1d5db;border-radius:12px;padding:16px}h1,h2,p{margin:0 0 8px}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left}.right{text-align:right}.total{font-size:22px;font-weight:700}.muted{color:#6b7280}@media print{body{padding:0}.card{break-inside:avoid}}
</style></head><body><h1>Maintenance Receipt</h1><p class="muted">${receipt.receiptNumber}</p><div class="grid"><div class="card"><h2>${society?.name || 'Society'}</h2><p>${[society?.address, society?.city, society?.state, society?.pincode].filter(Boolean).join(', ')}</p></div><div class="card"><p><strong>Issued:</strong> ${stamp(receipt.issuedAt)}</p><p><strong>Flat:</strong> ${flat?.flatNo || ''}</p><p><strong>Payer:</strong> ${receipt.paymentSnapshot.payerName}</p><p><strong>Method:</strong> ${receipt.paymentSnapshot.paymentMethod}</p></div></div><div class="card"><p class="total">${money(receipt.amountPaise)}</p><p class="muted">Advance carried: ${money(receipt.advanceAmountPaise)}</p><table><thead><tr><th>Demand</th><th class="right">Allocated</th></tr></thead><tbody>${rows || '<tr><td>Advance payment</td><td class="right">INR 0.00</td></tr>'}</tbody></table></div><div class="grid"><div class="card"><p><strong>Resident:</strong> ${receipt.residentSnapshot.name}</p><p>${receipt.residentSnapshot.mobile || ''}</p><p>${receipt.residentSnapshot.email || ''}</p></div><div class="card">${share ? `<p><strong>Public verification</strong></p><p class="muted">${share.verificationUrl}</p>${qrDataUrl ? `<img alt="Verification QR" src="${qrDataUrl}" style="width:140px;height:140px">` : ''}` : '<p class="muted">Public verification is disabled for this society.</p>'}</div></div></body></html>`;
    const checksum = crypto.createHash('sha256').update(html).digest('hex');
    if (receipt.pdfChecksum !== checksum) {
      receipt.pdfChecksum = checksum;
      await receipt.save();
    }
    return { receipt, html, checksum, fileName: `${receipt.receiptNumber}.html`, share };
  }
}

export const mcrReceiptDocumentService = new McrReceiptDocumentService();
