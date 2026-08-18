/**
 * Firebase Cloud Messaging. Best-effort: any failure (unsupported browser,
 * permission denied, network) is swallowed — push is a nice-to-have, never a
 * blocker for using the app.
 *
 * Two independent code paths, chosen by Capacitor.isNativePlatform():
 * - Native (Android APK): @capacitor-firebase/messaging, which talks to the
 *   native FCM SDK directly — required because the app deliberately disables
 *   its service worker on native (see pwaRegister.ts), so the web SDK's
 *   getToken()/service-worker path below never fires inside the WebView.
 * - Web (browser/PWA): the original firebase/messaging web-push path,
 *   unchanged.
 */
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
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
 * Requests notification permission (if not already decided), retrieves a
 * push token, and registers it with the backend. Safe to call on every
 * authenticated app load — it no-ops if permission is denied, unsupported,
 * or the token hasn't changed. Dispatches to the native or web path below.
 */
export async function registerPushNotifications(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await registerNativePushNotifications();
    return;
  }
  await registerWebPushNotifications();
}

let nativeTokenListenerAdded = false;

async function registerNativePushNotifications(): Promise<void> {
  try {
    let permission = await FirebaseMessaging.checkPermissions();
    if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
      permission = await FirebaseMessaging.requestPermissions();
    }
    if (permission.receive !== 'granted') return;

    if (!nativeTokenListenerAdded) {
      nativeTokenListenerAdded = true;
      // Fires on initial registration and whenever FCM rotates the token — keep the backend in sync.
      await FirebaseMessaging.addListener('tokenReceived', (event) => {
        void submitToken(event.token, 'ANDROID');
      });
    }

    const { token } = await FirebaseMessaging.getToken();
    if (token) await submitToken(token, 'ANDROID');
  } catch {
    // Push registration is best-effort — never block the app on this.
  }
}

async function registerWebPushNotifications(): Promise<void> {
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
    if (token) await submitToken(token, 'WEB');
  } catch {
    // Push registration is best-effort — never block the app on this.
  }
}

async function submitToken(token: string, platform: 'ANDROID' | 'WEB'): Promise<void> {
  if (localStorage.getItem(STORAGE_KEY) === token) return;
  await api.post('/notifications/device-tokens', { token, platform });
  localStorage.setItem(STORAGE_KEY, token);
}
