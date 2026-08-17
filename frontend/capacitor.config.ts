import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'in.iotsoft.community',
  appName: 'Jenix Community One',
  webDir: 'dist',
  server: {
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
