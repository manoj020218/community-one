import { Capacitor } from '@capacitor/core';

/**
 * The native Capacitor shell now loads the live site directly (see
 * capacitor.config.ts), which means it also picks up this site's own PWA
 * service worker — with no benefit (the APK install already *is* the native
 * install) and a real cost: after every deploy, the WebView can keep serving
 * a stale cached bundle until the SW's own background update cycle catches
 * up, which needs the app closed and reopened at least twice. Skip
 * registering it entirely on native, and proactively clean up any
 * already-registered one (e.g. from an earlier build before this fix), so
 * every launch fetches fresh content straight from the network.
 */
export async function setupServiceWorker(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // Best-effort cleanup only.
    }
    return;
  }

  const { registerSW } = await import('virtual:pwa-register');
  registerSW({ immediate: true });
}
