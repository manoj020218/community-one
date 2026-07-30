export type TicketStage =
  | 'UPLOADING_PHOTO'
  | 'NAME_INPUT'
  | 'PURPOSE_INPUT'
  | 'MOBILE_INPUT'
  | 'SUBMITTING'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED';

export interface KioskTicket {
  ticketId: string;
  flatId: string;
  flatNo: string;
  stage: TicketStage;
  photoFile?: File;
  photoFileId?: string;
  visitorName: string;
  purpose: string;
  visitorMobile: string;
  requestId?: string;
  createdAt: number;
  resolvedAt?: number;
  error?: string;
}

export const TERMINAL_STAGES: TicketStage[] = ['APPROVED', 'REJECTED', 'EXPIRED'];

export function newTicketId(): string {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
