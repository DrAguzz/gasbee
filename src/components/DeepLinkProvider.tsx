import React from "react";
import { useDeepLink } from "@/hooks/useDeepLink";
import { Capacitor } from "@capacitor/core";

export const DeepLinkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Only activate deep link listener on native platforms
  if (Capacitor.isNativePlatform()) {
    useDeepLink();
  }

  return <>{children}</>;
};
