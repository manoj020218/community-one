import QRCode from 'qrcode';
import { env } from '../../config/env';
import { patrolCheckpointService } from './patrolCheckpoint.service';

function esc(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export class GuardPatrolQrService {
  // A4-ish printable sticker sheet for one checkpoint — same qrcode/SVG approach as
  // mcrReceiptPoster.service.ts, sized for a single label rather than a full document.
  async buildCheckpointSticker(societyId: string, checkpointId: string): Promise<{ svg: string; fileName: string }> {
    const checkpoint = await patrolCheckpointService.findById(checkpointId);
    const scanUrl = `${env.FRONTEND_URL}/patrol-scan/${checkpoint.token}`;
    const qr = await QRCode.toDataURL(scanUrl, { width: 600, margin: 1 });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="760" viewBox="0 0 600 760">
      <rect width="600" height="760" fill="#ffffff"/>
      <rect x="20" y="20" width="560" height="720" rx="24" fill="#ffffff" stroke="#0f172a" stroke-width="3"/>
      <text x="300" y="90" text-anchor="middle" font-size="34" font-family="Segoe UI, Arial" font-weight="bold" fill="#0f172a">Patrol Checkpoint</text>
      <text x="300" y="140" text-anchor="middle" font-size="30" font-family="Segoe UI, Arial" fill="#1f2937">${esc(checkpoint.name)}</text>
      <image href="${qr}" x="100" y="180" width="400" height="400"/>
      <text x="300" y="640" text-anchor="middle" font-size="18" font-family="Segoe UI, Arial" fill="#64748b">Scan with the Jenix Guard app during your round</text>
      <text x="300" y="700" text-anchor="middle" font-size="14" font-family="Segoe UI, Arial" fill="#94a3b8">${esc(checkpoint.token.slice(0, 8))}</text>
    </svg>`;
    return { svg, fileName: `patrol-checkpoint-${checkpoint.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.svg` };
  }
}

export const guardPatrolQrService = new GuardPatrolQrService();
