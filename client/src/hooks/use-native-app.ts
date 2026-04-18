import { useEffect, useState } from "react";

const cap = typeof window !== "undefined" ? (window as any)?.Capacitor : undefined;

/**
 * Detects if the app is running inside a Capacitor native shell.
 * Synchronous initial value to avoid web-landing flash on native.
 */
export function useIsNativeApp() {
  const [isNative] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return cap?.isNativePlatform?.() ?? false;
  });

  const [isCapacitor] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return cap !== undefined;
  });

  useEffect(() => {
    if (isNative) {
      document.documentElement.classList.add("is-native-app");
    }
    if (isCapacitor) {
      document.documentElement.classList.add("is-capacitor");
    }
  }, [isNative, isCapacitor]);

  return isNative;
}

/**
 * Check if Capacitor is present (native or web-in-native)
 */
export function isCapacitorApp(): boolean {
  return cap !== undefined;
}
