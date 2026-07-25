import { env } from '../../config/env';
import { FirebasePushProvider } from './pushProvider.firebase';
import { NoopPushProvider } from './pushProvider.noop';
import { PushProvider } from './pushProvider.types';

class PushProviderService {
  private readonly provider: PushProvider;

  constructor() {
    this.provider = env.FCM_ENABLED ? new FirebasePushProvider() : new NoopPushProvider();
  }

  getProvider(): PushProvider {
    return this.provider;
  }
}

export const pushProviderService = new PushProviderService();
