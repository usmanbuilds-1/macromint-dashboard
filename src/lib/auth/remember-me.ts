import { brokeredPreviewStorage, type PreviewAuthStorage } from "@/integrations/supabase/previewAuthStorage";

const REMEMBER_KEY = "macromint.keep-signed-in";

/** Default to existing behavior: a Supabase session persists on this device. */
export function getRememberMe(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(REMEMBER_KEY) !== "false";
  } catch {
    return true;
  }
}

/**
 * A real persistence choice, never a saved password.
 * The Supabase storage adapter calls getRememberMe on every operation.
 */
export function setRememberMe(remember: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REMEMBER_KEY, String(remember));
  } catch {
    // Private modes may deny storage. The sign-in flow still works while open.
  }
}

/**
 * Integrates with Lovable's preview auth broker when persistent sign-in is
 * selected; otherwise keeps tokens in this tab's sessionStorage.
 * Session-only sessions disappear when the tab/browser session ends.
 */
export function rememberedAuthStorage(): PreviewAuthStorage | undefined {
  if (typeof window === "undefined") return undefined;
  const persistent = brokeredPreviewStorage() ?? localStorage;

  return {
    getItem(key) {
      if (getRememberMe()) return persistent.getItem(key);
      return sessionStorage.getItem(key);
    },
    setItem(key, value) {
      if (getRememberMe()) {
        sessionStorage.removeItem(key);
        return persistent.setItem(key, value);
      }
      sessionStorage.setItem(key, value);
      // Remove previously persisted tokens if the user switched this choice.
      void persistent.removeItem(key);
    },
    removeItem(key) {
      sessionStorage.removeItem(key);
      return persistent.removeItem(key);
    },
  };
}
