import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gasbee.app",
  appName: "Gasbee",
  webDir: "dist",
  android: {
    path: "android-user",
  },
  ios: {
    path: "ios-user",
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
