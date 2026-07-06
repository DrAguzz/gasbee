import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: 'com.gasbee.rider',
  appName: 'Gasbee Rider',
  webDir: "dist",
  android: {
    path: "android-rider",
  },
  ios: {
    path: "ios-rider",
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
