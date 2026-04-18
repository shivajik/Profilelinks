import { useEffect, useState } from "react";

function detectNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as any)?.Capacitor;
  return !!cap?.isNativePlatform?.();
}

/**
 * Detects if the app is running inside a Capacitor native shell.
 * Synchronous initial value to avoid web-landing flash on native.
 */
export function useIsNativeApp() {
  const [isNative] = useState<boolean>(() => detectNative());

  useEffect(() => {
    if (isNative) {
      document.documentElement.classList.add("is-native-app");
    }
  }, [isNative]);

  return isNative;
}
