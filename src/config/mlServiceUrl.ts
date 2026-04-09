import Constants from 'expo-constants';

/**
 * Your machine's LAN IP – update this if your network changes.
 * Run `ipconfig` (Windows) or `ifconfig` / `ip a` (Mac/Linux) to find it.
 */
const MACHINE_LAN_IP = '192.168.134.230';
const ML_SERVICE_PORT = 5000;
const LAN_FALLBACK_URL = `http://${MACHINE_LAN_IP}:${ML_SERVICE_PORT}`;

/**
 * Resolve the Python ML service URL.
 *
 * On a physical device running Expo Go, `localhost` refers to the phone
 * itself — not the dev machine where the Python service is running.
 * This helper extracts the dev machine's LAN IP from Expo's debugger
 * host URI (the same IP Expo Go already uses to reach the bundler) and
 * constructs the ML service URL from it.
 *
 * Priority:
 *   1. EXPO_PUBLIC_ML_SERVICE_URL env var (explicit override)
 *   2. Derived from Expo debugger host IP + port 5000
 *   3. Fallback to machine LAN IP (192.168.134.230:5000)
 */
export function getMLServiceUrl(): string {
  // 1. Explicit env var always wins
  const envUrl = process.env.EXPO_PUBLIC_ML_SERVICE_URL;
  if (envUrl && envUrl !== 'http://localhost:5000') {
    console.log(`[mlServiceUrl] Using env var: ${envUrl}`);
    return envUrl.replace(/\/$/, '');
  }

  // 2. Derive from Expo's debugger host (works in Expo Go on physical devices)
  try {
    const debuggerHost =
      Constants.expoConfig?.hostUri ?? // SDK 49+
      (Constants as any).manifest?.debuggerHost ?? // older SDKs
      null;

    if (debuggerHost) {
      // debuggerHost looks like "192.168.1.42:8081"
      const host = debuggerHost.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        const url = `http://${host}:${ML_SERVICE_PORT}`;
        console.log(`[mlServiceUrl] Resolved from Expo host: ${url}`);
        return url;
      }
    }
  } catch (e) {
    console.warn('[mlServiceUrl] Could not read Expo constants:', e);
  }

  // 3. Fallback to machine LAN IP (NOT localhost – that points to the phone)
  console.log(`[mlServiceUrl] Using LAN fallback: ${LAN_FALLBACK_URL}`);
  return LAN_FALLBACK_URL;
}
