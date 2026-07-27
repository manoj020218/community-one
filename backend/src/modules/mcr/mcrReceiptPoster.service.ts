import QRCode from 'qrcode';
import { Flat } from '../flat/flat.model';
import { Society } from '../society/society.model';
import { mcrReceiptPublicService } from './mcrReceiptPublic.service';
import { mcrReceiptQueryService } from './mcrReceiptQuery.service';
import { IMcrReceiptDocument } from './mcrReceipt.model';

function esc(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function money(value: number) {
  return `INR ${(value / 100).toFixed(2)}`;
}

export class McrReceiptPosterService {
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
      Society.findById(receipt.societyId).select('name city state'),
      Flat.findById(receipt.flatId).select('flatNo'),
      mcrReceiptPublicService.buildShareInfo(receipt, verifyBaseUrl, publicDocumentBaseUrl),
    ]);
    const qr = share?.verificationUrl ? await QRCode.toDataURL(share.verificationUrl) : '';
    const lines = receipt.allocationSnapshot.slice(0, 8).map((item, index) =>
      `<text x="70" y="${600 + index * 56}" font-size="28" fill="#1f2937">${esc(item.demandNumber)}</text><text x="1120" y="${600 + index * 56}" text-anchor="end" font-size="28" fill="#1f2937">${esc(money(item.allocatedAmountPaise))}</text>`
    ).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1754" viewBox="0 0 1240 1754"><rect width="1240" height="1754" fill="#f8fafc"/><rect x="40" y="40" width="1160" height="1674" rx="28" fill="#ffffff" stroke="#cbd5e1"/><text x="70" y="120" font-size="54" font-family="Segoe UI, Arial" fill="#0f172a">Maintenance Receipt</text><text x="70" y="168" font-size="24" font-family="Segoe UI, Arial" fill="#64748b">${esc(receipt.receiptNumber)}</text><text x="70" y="250" font-size="32" font-family="Segoe UI, Arial" fill="#0f172a">${esc(society?.name || 'Society')}</text><text x="70" y="292" font-size="24" font-family="Segoe UI, Arial" fill="#475569">${esc([society?.city, society?.state].filter(Boolean).join(', '))}</text><text x="70" y="392" font-size="24" font-family="Segoe UI, Arial" fill="#64748b">Flat</text><text x="70" y="430" font-size="34" font-family="Segoe UI, Arial" fill="#0f172a">${esc(flat?.flatNo || '')}</text><text x="420" y="392" font-size="24" font-family="Segoe UI, Arial" fill="#64748b">Payer</text><text x="420" y="430" font-size="34" font-family="Segoe UI, Arial" fill="#0f172a">${esc(receipt.paymentSnapshot.payerName)}</text><text x="70" y="520" font-size="24" font-family="Segoe UI, Arial" fill="#64748b">Demand</text><text x="1120" y="520" text-anchor="end" font-size="24" font-family="Segoe UI, Arial" fill="#64748b">Amount</text>${lines}<rect x="70" y="1110" width="1050" height="2" fill="#e2e8f0"/><text x="70" y="1180" font-size="24" font-family="Segoe UI, Arial" fill="#64748b">Advance carried</text><text x="1120" y="1180" text-anchor="end" font-size="28" font-family="Segoe UI, Arial" fill="#0f172a">${esc(money(receipt.advanceAmountPaise))}</text><text x="70" y="1270" font-size="26" font-family="Segoe UI, Arial" fill="#64748b">Total</text><text x="1120" y="1270" text-anchor="end" font-size="56" font-family="Segoe UI, Arial" fill="#0f172a">${esc(money(receipt.amountPaise))}</text><text x="70" y="1360" font-size="24" font-family="Segoe UI, Arial" fill="#64748b">Resident</text><text x="70" y="1398" font-size="30" font-family="Segoe UI, Arial" fill="#0f172a">${esc(receipt.residentSnapshot.name)}</text><text x="70" y="1450" font-size="22" font-family="Segoe UI, Arial" fill="#475569">${esc(receipt.residentSnapshot.mobile || '')}</text><text x="70" y="1488" font-size="22" font-family="Segoe UI, Arial" fill="#475569">${esc(receipt.residentSnapshot.email || '')}</text>${qr ? `<image href="${qr}" x="920" y="1320" width="200" height="200"/><text x="1020" y="1548" text-anchor="middle" font-size="18" font-family="Segoe UI, Arial" fill="#64748b">Verify</text>` : ''}</svg>`;
    return { svg, fileName: `${receipt.receiptNumber}-poster.svg` };
  }
}

export const mcrReceiptPosterService = new McrReceiptPosterService();
