/**
 * Firebase Cloud Messaging (web push). Best-effort: any failure (unsupported
 * browser, permission denied, network) is swallowed — push is a nice-to-have,
 * never a blocker for using the app.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, type Messaging } from 'firebase/messaging';
import { api } from '../services/api';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

const STORAGE_KEY = 'jenix_fcm_token';

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

function isConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId && VAPID_KEY);
}

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

function getMessagingInstance(): Messaging | null {
  if (!isConfigured() || !isSupported()) return null;
  if (!app) app = initializeApp(firebaseConfig);
  if (!messaging) messaging = getMessaging(app);
  return messaging;
}

/**
 * Requests notification permission (if not already decided), registers the
 * FCM service worker, retrieves a push token, and registers it with the
 * backend. Safe to call on every authenticated app load — it no-ops if
 * permission is denied, unsupported, or the token hasn't changed.
 */
export async function registerPushNotifications(): Promise<void> {
  try {
    const msg = getMessagingInstance();
    if (!msg) return;

    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      if (result !== 'granted') return;
    }
    if (Notification.permission !== 'granted') return;

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(msg, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) return;

    if (localStorage.getItem(STORAGE_KEY) === token) return;

    await api.post('/notifications/device-tokens', { token, platform: 'WEB' });
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Push registration is best-effort — never block the app on this.
  }
}
