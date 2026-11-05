// Petit client pour l'API du Worker.
import type { AppState, HistoryItem } from '../shared/types';

const KEY_STORAGE = 'ctrlzen.key';

export function getKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setKey(k: string) {
  try {
    if (k) localStorage.setItem(KEY_STORAGE, k);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* stockage indisponible */
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = { ok: boolean }>(path: string, method = 'GET', body?: unknown, key = getKey()): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Pas de connexion internet');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error || 'Une erreur est survenue');
  return data as T;
}

export const loadState = (key?: string) => api<AppState>('state', 'GET', undefined, key);
export const loadHistory = () => api<HistoryItem[]>('history');
