import type { SubjectConfig } from '../types/config';
import type { CommunitySubject } from './storage';

// Thin client for the optional Vercel serverless backend (see /api). It lets accounts and
// shared questions work across devices via a small Redis-backed store. The backend is
// optional — when it isn't deployed/configured, every call here fails fast (network error
// or 503) and callers fall back to the existing localStorage-only behaviour. Nothing here
// should ever throw; every function resolves to a typed result the caller can branch on.

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; reason: 'not-configured' | 'unauthorized' | 'error' | 'network' };

async function call<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    return { ok: false, status: 0, error: 'Server není dostupný.', reason: 'network' };
  }
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* no/invalid JSON body */
  }
  if (res.ok) return { ok: true, data: body as T };
  const error: string = body?.error || `Chyba serveru (${res.status}).`;
  let reason: 'not-configured' | 'unauthorized' | 'error' | 'network' = 'error';
  if (res.status === 503) reason = 'not-configured';
  else if (res.status === 401 || res.status === 403) reason = 'unauthorized';
  return { ok: false, status: res.status, error, reason };
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export interface AuthResponse {
  token: string;
  username: string;
  isAdmin: boolean;
}

export function serverRegister(username: string, password: string) {
  return call<AuthResponse>('auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function serverLogin(username: string, password: string) {
  return call<AuthResponse>('auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function serverListCommunity(token?: string | null) {
  return call<{ items: CommunitySubject[] }>('community/list', {
    headers: token ? authHeaders(token) : undefined,
  });
}

export function serverShareSubject(token: string, config: SubjectConfig) {
  return call<{ entry: CommunitySubject }>('community/share', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ config }),
  });
}

export function serverWithdrawSubject(token: string, subjectId: string) {
  return call<{ ok: true }>('community/withdraw', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ subjectId }),
  });
}

export interface AdminUserSummary {
  username: string;
  isAdmin: boolean;
  subjects: { subject: string; name: string; questionCount: number }[];
}

export function serverAdminUsers(token: string) {
  return call<{ users: AdminUserSummary[] }>('admin/users', { headers: authHeaders(token) });
}

export function serverAdminCommunityList(token: string) {
  return call<{ items: CommunitySubject[] }>('admin/community', { headers: authHeaders(token) });
}

export function serverAdminSetPublic(token: string, id: string, isPublic: boolean) {
  return call<{ ok: true }>('admin/community', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ action: 'set-public', id, public: isPublic }),
  });
}

export function serverAdminRemove(token: string, id: string) {
  return call<{ ok: true }>('admin/community', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ action: 'remove', id }),
  });
}

export function serverLoadMyConfigs(token: string) {
  return call<{ configs: SubjectConfig[] }>('my-questions/sync', { headers: authHeaders(token) });
}

export function serverSaveMyConfigs(token: string, configs: SubjectConfig[]) {
  return call<{ ok: true }>('my-questions/sync', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ configs }),
  });
}

// Per-user learning data (progress / sessions / bookmarks / settings / overrides) so stats and
// preferences follow the user across devices. The blob shape is defined in storage.ts.
export function serverLoadUserData<T = unknown>(token: string) {
  return call<{ data: T | null }>('user-data/sync', { headers: authHeaders(token) });
}

export function serverSaveUserData<T = unknown>(token: string, data: T) {
  return call<{ ok: true }>('user-data/sync', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ data }),
  });
}
