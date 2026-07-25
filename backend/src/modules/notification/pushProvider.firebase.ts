import fs from 'fs';
import { env } from '../../config/env';
import { PushMessage, PushProvider, PushProviderHealth, PushSendResult } from './pushProvider.types';

function resolveCredential(): { projectId: string; clientEmail: string; privateKey: string } | null {
  if (env.FCM_SERVICE_ACCOUNT_PATH && fs.existsSync(env.FCM_SERVICE_ACCOUNT_PATH)) {
    const content = JSON.parse(fs.readFileSync(env.FCM_SERVICE_ACCOUNT_PATH, 'utf-8'));
    return { projectId: content.project_id, clientEmail: content.client_email, privateKey: content.private_key };
  }

  if (!env.FCM_PROJECT_ID || !env.FCM_CLIENT_EMAIL || !env.FCM_PRIVATE_KEY) return null;
  return {
    projectId: env.FCM_PROJECT_ID,
    clientEmail: env.FCM_CLIENT_EMAIL,
    privateKey: env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
}

function loadFirebaseAdmin(): any | null {
  try {
    return {
      app: require('firebase-admin/app'),
      messaging: require('firebase-admin/messaging'),
    };
  } catch {
    return null;
  }
}

export class FirebasePushProvider implements PushProvider {
  readonly provider = 'FCM' as const;
  private readonly health: PushProviderHealth;

  constructor() {
    const credential = resolveCredential();
    const admin = loadFirebaseAdmin();
    this.health = { provider: 'FCM', status: credential && admin ? 'configured' : 'misconfigured' };

    if (credential && admin && !admin.app.getApps().length) {
      admin.app.initializeApp({ credential: admin.app.cert(credential) });
    }
  }

  async send(tokens: string[], message: PushMessage): Promise<PushSendResult[]> {
    if (this.health.status !== 'configured' || !tokens.length) return [];
    const admin = loadFirebaseAdmin();
    if (!admin) return [];

    const response = await admin.messaging.getMessaging().sendEachForMulticast({
      tokens,
      notification: { title: message.title, body: message.body },
      data: message.data,
    });

    return response.responses.map((result: any, index: number) => ({
      token: tokens[index],
      success: result.success,
      messageId: result.messageId,
      errorCode: result.error?.code,
      errorMessage: result.error?.message,
    }));
  }

  getHealth(): PushProviderHealth {
    return this.health;
  }
}
