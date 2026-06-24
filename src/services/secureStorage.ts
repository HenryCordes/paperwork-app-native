import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const secureStorage = { getItem, setItem, removeItem };

// Single source of truth for every key this app's auth cluster reads or
// writes — ported verbatim from paperwork-app's capacitor-secure-storage-plugin
// usage across useAuth.ts, useSessionManager.ts, and biometrics.service.ts.
// AUTH_TOKEN_KEY is new: paperwork-app keeps the token in plain localStorage
// under the literal string "authToken", not secure storage (see design.md's
// reasoning for moving it here).
export const AUTH_TOKEN_KEY = "auth_token";
export const RECENT_LOGOUT_KEY = "recent_logout";
export const SESSION_TIMEOUT_KEY = "session_timeout_minutes";
export const LAST_ACTIVE_KEY = "last_active_timestamp";
export const AUTH_IN_PROGRESS_KEY = "auth_in_progress";
export const BIOMETRICS_ENABLED_KEY = "biometrics_enabled";
const BIOMETRICS_CREDENTIALS_SERVER = "nl.paperwork.app.auth";
export const BIOMETRICS_USERNAME_KEY = `${BIOMETRICS_CREDENTIALS_SERVER}_username`;
export const BIOMETRICS_PASSWORD_KEY = `${BIOMETRICS_CREDENTIALS_SERVER}_password`;
