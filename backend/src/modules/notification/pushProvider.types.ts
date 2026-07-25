export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushSendResult {
  token: string;
  success: boolean;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface PushProviderHealth {
  provider: 'FCM';
  status: 'configured' | 'disabled' | 'misconfigured';
}

export interface PushProvider {
  readonly provider: 'FCM';
  send(tokens: string[], message: PushMessage): Promise<PushSendResult[]>;
  getHealth(): PushProviderHealth;
}
