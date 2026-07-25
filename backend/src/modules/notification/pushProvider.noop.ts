import { env } from '../../config/env';
import { PushMessage, PushProvider, PushProviderHealth, PushSendResult } from './pushProvider.types';

export class NoopPushProvider implements PushProvider {
  readonly provider = 'FCM' as const;

  async send(tokens: string[], _message: PushMessage): Promise<PushSendResult[]> {
    const status = env.FCM_ENABLED ? 'misconfigured' : 'disabled';
    const errorMessage = status === 'disabled' ? 'FCM provider is disabled' : 'FCM provider is not configured';
    return tokens.map((token) => ({
      token,
      success: false,
      errorCode: status.toUpperCase(),
      errorMessage,
    }));
  }

  getHealth(): PushProviderHealth {
    return { provider: 'FCM', status: env.FCM_ENABLED ? 'misconfigured' : 'disabled' };
  }
}
