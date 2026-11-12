/** Client exclusivo da autenticação local do Guardião (não interfere no SDK OAuth). */
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";

const TOKEN_KEY = "guardiao_local_session_v1";
export type GuardiaoAccount = {
  id: number;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  createdDate: string;
  updatedDate: string;
};

function baseUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return `http://${window.location.hostname}:3000`;
  }
  const url = getApiBaseUrl().replace(/\/$/, "");
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error("Configure EXPO_PUBLIC_API_BASE_URL com o IP do computador e a porta 3000.");
  }
  return url;
}

async function request<T>(path: string, method: "GET" | "POST" | "PATCH", payload?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (Platform.OS !== "web") {
    headers["X-Guardiao-Platform"] = "native";
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      method,
      credentials: "include",
      headers,
      signal: controller.signal,
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(typeof data.error === "string" ? data.error : `Erro HTTP ${response.status}`);
    }
    return data as T;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Tempo limite de conexão com o servidor. Verifique o IP e a rede.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function registerAccount(name: string, email: string, password: string) {
  return request<{ success: boolean; message: string }>("/api/guardiao-auth/register", "POST", { name, email, password });
}

export async function loginAccount(email: string, password: string): Promise<GuardiaoAccount> {
  const data = await request<{ account: GuardiaoAccount; token?: string }>(
    "/api/guardiao-auth/login", "POST", { email, password },
  );
  if (Platform.OS !== "web") {
    if (!data.token) throw new Error("O servidor não devolveu o token para o aplicativo Android.");
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
  }
  return data.account;
}

export async function currentAccount(): Promise<GuardiaoAccount | null> {
  if (Platform.OS !== "web") {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return null;
  }
  try {
    const result = await request<{ account: GuardiaoAccount }>("/api/guardiao-auth/me", "GET");
    return result.account;
  } catch (error) {
    if (error instanceof Error && /sessão inválida|expirada/i.test(error.message)) {
      if (Platform.OS !== "web") await SecureStore.deleteItemAsync(TOKEN_KEY);
      return null;
    }
    throw error;
  }
}

export async function updateAccountName(name: string): Promise<GuardiaoAccount> {
  const result = await request<{ account: GuardiaoAccount }>(
    "/api/guardiao-auth/profile", "PATCH", { name },
  );
  return result.account;
}

export async function logoutAccount(): Promise<void> {
  await request<{ success: boolean }>("/api/guardiao-auth/logout", "POST");
  if (Platform.OS !== "web") await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/** Alteração sensível: o servidor revoga todas as sessões e exige novo login. */
export async function changeAccountPassword(currentPassword: string, newPassword: string): Promise<void> {
  await request<{ success: boolean; requiresLogin: boolean }>(
    "/api/guardiao-auth/change-password", "POST", { currentPassword, newPassword },
  );
  if (Platform.OS !== "web") await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/** A troca de e-mail NÃO equivale a verificar sua titularidade. */
export async function changeAccountEmail(currentPassword: string, newEmail: string): Promise<void> {
  await request<{ success: boolean; requiresLogin: boolean }>(
    "/api/guardiao-auth/change-email", "POST", { currentPassword, newEmail },
  );
  if (Platform.OS !== "web") await SecureStore.deleteItemAsync(TOKEN_KEY);
}
