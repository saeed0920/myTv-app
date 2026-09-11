import * as Network from "expo-network";
import * as SecureStore from "expo-secure-store";

export type DeviceInfo = {
  id: string;
  name: string;
  model: string;
  apiVersion: number;
  capabilities: string[];
};

export type PlaybackStatus = {
  position: number;
  duration: number;
  title: string;
  paused: boolean;
  volume: number;
  muted: boolean;
};

export type Quality = { height: number; fps: number; low: boolean };

const LAST_SERVER = "mytv.server";

export function serverUrl(value: string) {
  const input = value.trim().replace(/\/$/, "");
  if (!input) throw new Error("Enter MediaBox address");
  const url = input.includes("://") ? input : `http://${input}`;
  const parsed = new URL(url);
  if (!parsed.port) parsed.port = "8080";
  return parsed.origin;
}

export async function api<T>(baseUrl: string, path: string, init?: RequestInit, timeout = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
      signal: controller.signal,
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

export function post<T>(baseUrl: string, path: string, body: object) {
  return api<T>(baseUrl, path, { method: "POST", body: JSON.stringify(body) }, 125000);
}

async function identify(candidate: string) {
  const baseUrl = serverUrl(candidate);
  const info = await api<DeviceInfo>(baseUrl, "/api/info", undefined, 900);
  return info.id === "sei610-mediabox" ? { baseUrl, info } : null;
}

export async function discoverServer() {
  const saved = await SecureStore.getItemAsync(LAST_SERVER);
  for (const candidate of [saved, "http://mediabox.local:8080"]) {
    if (!candidate) continue;
    try {
      const found = await identify(candidate);
      if (found) return found;
    } catch {}
  }

  const address = await Network.getIpAddressAsync();
  const parts = address.split(".");
  if (parts.length !== 4) throw new Error("Connect phone to same Wi-Fi as MediaBox");
  const prefix = parts.slice(0, 3).join(".");
  const hosts = Array.from({ length: 254 }, (_, index) => `http://${prefix}.${index + 1}:8080`);

  for (let index = 0; index < hosts.length; index += 24) {
    const results = await Promise.all(
      hosts.slice(index, index + 24).map(async candidate => {
        try { return await identify(candidate); } catch { return null; }
      }),
    );
    const found = results.find(Boolean);
    if (found) return found;
  }
  throw new Error("No MediaBox found on this Wi-Fi");
}

export async function rememberServer(baseUrl: string) {
  await SecureStore.setItemAsync(LAST_SERVER, baseUrl);
}

export async function connectServer(value: string) {
  const found = await identify(value);
  if (!found) throw new Error("Address is not a MediaBox");
  await rememberServer(found.baseUrl);
  return found;
}
