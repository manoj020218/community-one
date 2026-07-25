export interface CommunicationSettings {
  societyId: string;
  smtp: {
    host?: string;
    port?: number;
    secure: boolean;
    username?: string;
    password?: string; // masked as "••••••••" when already set — never the real value
    fromEmail?: string;
    fromName?: string;
    enabled: boolean;
  };
  whatsapp: {
    phoneNumber?: string;
    status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';
    linkedAt?: string;
    lastConnectedAt?: string;
  };
  smsGateway: {
    enabled: boolean;
  };
}

export interface WhatsAppStatus {
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';
  phoneNumber?: string;
  qrDataUrl?: string;
}
