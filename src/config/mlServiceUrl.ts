import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Network from 'expo-network';

const ML_SERVICE_PORT = 5000;
const HEALTH_TIMEOUT_MS = 1200;
const CACHE_KEY = 'ihv.mlServiceUrl';

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function urlForHost(host: string): string {
  return `http://${host}:${ML_SERVICE_PORT}`;
}

function getExpoHostUrl(): string | null {
  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest?.debuggerHost ??
    null;

  if (!debuggerHost) {
    return null;
  }

  const host = debuggerHost.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  return urlForHost(host);
}

function getStaticCandidateUrls(): string[] {
  const candidates = [
    process.env.EXPO_PUBLIC_ML_SERVICE_URL,
    getExpoHostUrl(),
    'http://10.0.2.2:5000',
    'http://10.0.3.2:5000',
    'http://localhost:5000',
  ];

  return Array.from(
    new Set(
      candidates
        .filter((candidate): candidate is string => Boolean(candidate))
        .map(normalizeUrl)
    )
  );
}

async function canReachService(baseUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json().catch(() => null);
    return data?.status === 'healthy' || data?.service;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function findServiceOnLan(): Promise<string | null> {
  const ipAddress = await Network.getIpAddressAsync().catch(() => null);
  if (!ipAddress) {
    return null;
  }

  const parts = ipAddress.split('.');
  if (parts.length !== 4) {
    return null;
  }

  const prefix = parts.slice(0, 3).join('.');
  const phoneHost = Number(parts[3]);
  const preferredHosts = [
    1,
    2,
    3,
    10,
    20,
    50,
    100,
    101,
    102,
    200,
    254,
    phoneHost - 1,
    phoneHost + 1,
  ].filter(host => host > 0 && host < 255 && host !== phoneHost);

  const orderedHosts = [
    ...preferredHosts,
    ...Array.from({ length: 254 }, (_, index) => index + 1),
  ].filter((host, index, list) => host !== phoneHost && list.indexOf(host) === index);

  const concurrency = 24;
  for (let index = 0; index < orderedHosts.length; index += concurrency) {
    const batch = orderedHosts.slice(index, index + concurrency);
    const checks = await Promise.all(
      batch.map(async host => {
        const url = urlForHost(`${prefix}.${host}`);
        return (await canReachService(url)) ? url : null;
      })
    );

    const found = checks.find(Boolean);
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Fast synchronous fallback for places that need an initial value before async
 * discovery finishes. Network calls should use resolveMLServiceUrl instead.
 */
export function getMLServiceUrl(): string {
  return getStaticCandidateUrls()[0] ?? 'http://localhost:5000';
}

/**
 * Resolve a reachable Python ML service URL without manually editing ipconfig.
 *
 * The resolver validates configured/dev URLs first, then scans the phone's
 * current /24 Wi-Fi subnet for the Flask health endpoint. That makes standalone
 * APKs work on a physical phone as long as the phone and backend machine are on
 * the same network and port 5000 is allowed through the firewall.
 */
export async function resolveMLServiceUrl(): Promise<string> {
  const cachedUrl = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
  const candidates = [
    cachedUrl,
    ...getStaticCandidateUrls(),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of Array.from(new Set(candidates.map(normalizeUrl)))) {
    if (await canReachService(candidate)) {
      await AsyncStorage.setItem(CACHE_KEY, candidate).catch(() => undefined);
      console.log(`[mlServiceUrl] Connected at ${candidate}`);
      return candidate;
    }
  }

  const lanUrl = await findServiceOnLan();
  if (lanUrl) {
    await AsyncStorage.setItem(CACHE_KEY, lanUrl).catch(() => undefined);
    console.log(`[mlServiceUrl] Discovered on LAN: ${lanUrl}`);
    return lanUrl;
  }

  const fallback = getMLServiceUrl();
  console.warn(`[mlServiceUrl] No reachable service found; falling back to ${fallback}`);
  return fallback;
}
