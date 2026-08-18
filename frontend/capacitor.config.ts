import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'in.iotsoft.community',
  appName: 'Jenix Community One',
  webDir: 'dist',
  server: {
    // Without this, the WebView serves bundled local assets from a synthetic
    // https://localhost origin, and every relative /api/... call (axios baseURL
    // is '/api') silently resolves against that fake origin instead of the real
    // backend — no network error surfaces, requests just go nowhere. Pointing
    // Capacitor at the live site instead makes it behave exactly like a normal
    // browser tab: same origin for the page and its API calls, so nothing here
    // needs its own CORS allowance and there's no separate "native API base URL"
    // to keep in sync.
    url: 'https://community.iotsoft.in',
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#4F46E5',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#4F46E5',
    },
  },
};

export default config;
