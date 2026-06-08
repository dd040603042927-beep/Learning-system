import type { AiAction } from "./ai";
import type { AppState } from "../types";

export interface AuthUser {
  id: string;
  username: string;
  createdAt: string;
}

export interface AuthPayload {
  token: string;
  user: AuthUser;
  state: AppState;
}

const TOKEN_KEY = "personal-learning-system:token";

const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
const API_BASE =
  env?.VITE_API_BASE || (window.location.port === "5173" ? "http://127.0.0.1:5175" : "");

export function getToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || "请求失败");
  }
  return body as T;
}

export async function registerUser(username: string, password: string) {
  const payload = await request<AuthPayload>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(payload.token);
  return payload;
}

export async function loginUser(username: string, password: string) {
  const payload = await request<AuthPayload>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(payload.token);
  return payload;
}

export async function logoutUser() {
  try {
    await request<{ ok: true }>("/api/auth/logout", { method: "POST" });
  } finally {
    clearToken();
  }
}

export async function getCurrentUser() {
  if (!getToken()) return null;
  try {
    return await request<{ user: AuthUser; state: AppState }>("/api/auth/me");
  } catch {
    clearToken();
    return null;
  }
}

export async function saveRemoteState(state: AppState) {
  return request<{ ok: true }>("/api/state", {
    method: "PUT",
    body: JSON.stringify({ state }),
  });
}

export async function runBackendAi(action: AiAction, noteId?: string) {
  const payload = await request<{ output: string }>("/api/ai", {
    method: "POST",
    body: JSON.stringify({ action, noteId }),
  });
  return payload.output;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const chunks: string[] = [];
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    chunks.push(String.fromCharCode(...chunk));
  }
  return window.btoa(chunks.join(""));
}

export async function extractResourceFileText(file: File) {
  const buffer = await file.arrayBuffer();
  return request<{ text: string; status: "extracted" | "empty" }>("/api/resources/extract-text", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      base64: arrayBufferToBase64(buffer),
    }),
  });
}
