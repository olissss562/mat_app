// Shared server-side data layer for the cross-device "community" features
// (accounts that work from any device + a shared question pool curated by an admin).
//
// Storage: Upstash Redis (the integration Vercel now recommends in place of the
// deprecated "Vercel KV"). To make this work in your deployment:
//   1. In your Vercel project, open the "Storage" tab and add an "Upstash Redis"
//      database from the Marketplace (free tier is enough for this use case).
//   2. Vercel automatically injects the connection env vars into your project
//      (KV_REST_API_URL / KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL / _TOKEN —
//      we read whichever pair is present, see redis() below).
//   3. Redeploy. On first request the admin account described in seedAdmin() is
//      created automatically if it doesn't exist yet.
//
// Without a configured Redis instance these endpoints respond with a clear
// "503 — server storage not configured" error instead of crashing, so the rest of
// the app (which still works fully offline via localStorage) keeps functioning.

import { Redis } from '@upstash/redis';
import type { SubjectConfig } from './configTypes';

let redisClient: Redis | null | undefined;

export function redis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return null;
  }
  try {
    redisClient = new Redis({ url, token });
  } catch (err) {
    // Malformed URL/token etc. — treat as "not configured" rather than crashing every request.
    // eslint-disable-next-line no-console
    console.error('[api] failed to construct Redis client:', err);
    redisClient = null;
  }
  return redisClient;
}

export function isConfigured(): boolean {
  return redis() !== null;
}

// ---------- Types (mirrors src/lib/storage.ts shapes used client-side) ----------
export interface ServerUser {
  username: string;
  passwordHash: string;
  isAdmin?: boolean;
}

export interface CommunitySubject {
  id: string;
  author: string;
  subjectId: string;
  name: string;
  config: SubjectConfig;
  public: boolean;
  sharedAt: number;
}

const KEYS = {
  users: 'mt:server:users', // ServerUser[]
  community: 'mt:server:community', // CommunitySubject[]
  myConfigs: (username: string) => `mt:server:myconfigs:${username.toLowerCase()}`, // SubjectConfig[]
  sessions: 'mt:server:sessions', // Record<token, username>
} as const;

async function getJSON<T>(key: string, fallback: T): Promise<T> {
  const r = redis();
  if (!r) return fallback;
  const value = await r.get<T>(key);
  return value ?? fallback;
}
async function setJSON<T>(key: string, value: T): Promise<void> {
  const r = redis();
  if (!r) return;
  await r.set(key, value);
}

// ---------- Password hashing ----------
// Same lightweight djb2-style hash as the client (see src/lib/storage.ts) — kept
// consistent so the same credentials work whether the request is handled locally
// or by the server. As noted there: NOT cryptographically secure, just enough to
// avoid storing raw passwords. Don't reuse a sensitive password for this app.
export function hashPassword(password: string): string {
  let hash = 5381;
  for (let i = 0; i < password.length; i++) {
    hash = (hash * 33) ^ password.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

// ---------- Users ----------
export async function loadUsers(): Promise<ServerUser[]> {
  return getJSON<ServerUser[]>(KEYS.users, []);
}
async function saveUsers(users: ServerUser[]): Promise<void> {
  await setJSON(KEYS.users, users);
}

export async function findUser(username: string): Promise<ServerUser | undefined> {
  const users = await loadUsers();
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export async function createUser(username: string, password: string, isAdmin = false): Promise<ServerUser | null> {
  const users = await loadUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) return null;
  const user: ServerUser = { username, passwordHash: hashPassword(password), isAdmin };
  users.push(user);
  await saveUsers(users);
  return user;
}

/** Ensures the requested admin account exists (idempotent — safe to call on every request). */
export async function seedAdmin(): Promise<void> {
  const existing = await findUser('admin');
  if (existing) {
    if (!existing.isAdmin) {
      const users = await loadUsers();
      const idx = users.findIndex((u) => u.username.toLowerCase() === 'admin');
      if (idx >= 0) {
        users[idx] = { ...users[idx], isAdmin: true };
        await saveUsers(users);
      }
    }
    return;
  }
  await createUser('admin', 'heslo123456789+++', true);
}

// ---------- Sessions (very small "logged in" tokens, NOT a security boundary) ----------
// We avoid sending passwords on every request by issuing a random opaque token at
// login/register time and mapping it to a username server-side. Tokens don't expire —
// this mirrors the lightweight, "shared device" spirit of the rest of the auth system,
// just stretched to also work across devices.
export async function createSession(username: string): Promise<string> {
  const sessions = await getJSON<Record<string, string>>(KEYS.sessions, {});
  const token = `${username}.${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  sessions[token] = username;
  await setJSON(KEYS.sessions, sessions);
  return token;
}
export async function resolveSession(token: string | null | undefined): Promise<ServerUser | null> {
  if (!token) return null;
  const sessions = await getJSON<Record<string, string>>(KEYS.sessions, {});
  const username = sessions[token];
  if (!username) return null;
  return (await findUser(username)) ?? null;
}

// ---------- Personal questions (so the admin can review what each user authored) ----------
export async function loadMyConfigs(username: string): Promise<SubjectConfig[]> {
  return getJSON<SubjectConfig[]>(KEYS.myConfigs(username), []);
}
export async function saveMyConfigs(username: string, configs: SubjectConfig[]): Promise<void> {
  await setJSON(KEYS.myConfigs(username), configs);
}

// ---------- Community sharing pool ----------
export async function loadCommunity(): Promise<CommunitySubject[]> {
  return getJSON<CommunitySubject[]>(KEYS.community, []);
}
async function saveCommunity(items: CommunitySubject[]): Promise<void> {
  await setJSON(KEYS.community, items);
}

export async function shareSubject(author: string, config: SubjectConfig): Promise<CommunitySubject> {
  const items = await loadCommunity();
  const idx = items.findIndex((c) => c.author === author && c.subjectId === config.subject);
  let entry: CommunitySubject;
  if (idx >= 0) {
    entry = { ...items[idx], name: config.name, config, sharedAt: Date.now() };
    items[idx] = entry;
  } else {
    entry = {
      id: `${author}:${config.subject}:${Date.now().toString(36)}`,
      author,
      subjectId: config.subject,
      name: config.name,
      config,
      public: false,
      sharedAt: Date.now(),
    };
    items.push(entry);
  }
  await saveCommunity(items);
  return entry;
}
export async function unshareSubject(author: string, subjectId: string): Promise<void> {
  const items = (await loadCommunity()).filter((c) => !(c.author === author && c.subjectId === subjectId));
  await saveCommunity(items);
}
export async function setCommunityPublic(id: string, isPublic: boolean): Promise<boolean> {
  const items = await loadCommunity();
  const idx = items.findIndex((c) => c.id === id);
  if (idx < 0) return false;
  items[idx] = { ...items[idx], public: isPublic };
  await saveCommunity(items);
  return true;
}
export async function removeCommunityEntry(id: string): Promise<void> {
  await saveCommunity((await loadCommunity()).filter((c) => c.id !== id));
}
