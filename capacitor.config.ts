import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gasbee.user',
  appName: 'Gasbee',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Browser: {},
    SplashScreen: {
      launchShowDuration: 1000,
    },
  },
};

export default config;
