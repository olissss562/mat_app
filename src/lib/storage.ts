import type { Progress } from './srs';
import type { SubjectConfig } from '../types/config';

// Per-user namespace: each signed-in user gets their own slice of localStorage so that
// multiple people sharing one device/browser don't see each other's progress and stats.
// This is NOT a security boundary (passwords are only lightly obscured, not cryptographically
// hashed) — it's purely a convenience separation for shared devices.
let activeUser: string | null = null;
export function setActiveUser(username: string | null): void {
  activeUser = username;
}
export function getActiveUser(): string | null {
  return activeUser;
}
function ns(base: string): string {
  return activeUser ? `mt:${activeUser}:${base}` : `mt:${base}`;
}

const KEYS = {
  progress: 'progress',
  settings: 'settings',
  bookmarks: 'bookmarks',
  importedConfigs: 'importedConfigs',
  sessions: 'sessions',
  questionOverrides: 'questionOverrides',
  myConfigs: 'myConfigs',
} as const;

// Global (not namespaced) keys for the user accounts themselves.
const GLOBAL_KEYS = {
  users: 'mt:users',
  currentUser: 'mt:currentUser',
  community: 'mt:community',
  serverSession: 'mt:serverSession',
} as const;

// ---------- Server session (cross-device sharing) ----------
// When a real backend is configured (see src/lib/serverApi.ts / api/*), logging in or
// registering also obtains an opaque session token from the server. We keep it here so the
// app can call authenticated endpoints (sync personal questions, share to the community pool,
// admin views) no matter which device the user is on. Stored per-username so switching the
// active local account doesn't lose another account's token.
export interface ServerSession {
  username: string;
  token: string;
}
export function loadServerSession(username: string | null): ServerSession | null {
  if (!username) return null;
  const all = readJSON<Record<string, string>>(GLOBAL_KEYS.serverSession, {});
  const token = all[username.toLowerCase()];
  return token ? { username, token } : null;
}
export function saveServerSession(username: string, token: string | null): void {
  const all = readJSON<Record<string, string>>(GLOBAL_KEYS.serverSession, {});
  const key = username.toLowerCase();
  if (token === null) delete all[key];
  else all[key] = token;
  writeJSON(GLOBAL_KEYS.serverSession, all);
}

export type AccentColor = 'violet' | 'blue' | 'emerald' | 'rose' | 'amber';

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  accentColor: AccentColor;
  sound: boolean;
  autoAdvance: boolean; // automatically jump to next question after a correct answer
  lastSubject?: string;
}

export interface SessionSummary {
  id: string;
  timestamp: number;
  subjectId: string;
  mode: string;
  total: number;
  correct: number;
  accuracy: number; // 0..1
  durationMs: number;
}

const SESSIONS_CAP = 50;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable; ignore */
  }
}

// ---------- Cross-device sync change notification ----------
// The optional server sync (src/lib/userDataSync.ts) registers a handler here so it can push the
// user's data to the backend (debounced) whenever any syncable slice changes locally. We suppress
// notifications while applying a freshly-pulled snapshot so a pull doesn't immediately re-trigger
// a push (which would echo back and forth pointlessly).
let userDataChangeHandler: (() => void) | null = null;
let suppressUserDataChange = false;
export function setUserDataChangeHandler(cb: (() => void) | null): void {
  userDataChangeHandler = cb;
}
function emitUserDataChange(): void {
  if (suppressUserDataChange) return;
  try {
    userDataChangeHandler?.();
  } catch {
    /* never let a sync listener break a local save */
  }
}

// ---------- Progress ----------
export function loadProgress(): Record<string, Progress> {
  return readJSON<Record<string, Progress>>(ns(KEYS.progress), {});
}
export function saveProgress(progress: Record<string, Progress>): void {
  writeJSON(ns(KEYS.progress), progress);
  emitUserDataChange();
}

// ---------- Settings ----------
const DEFAULT_SETTINGS: Settings = { theme: 'system', accentColor: 'violet', sound: true, autoAdvance: true };
export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readJSON<Partial<Settings>>(ns(KEYS.settings), {}) };
}
export function saveSettings(settings: Settings): void {
  writeJSON(ns(KEYS.settings), settings);
  emitUserDataChange();
}

// ---------- Bookmarks ----------
export function loadBookmarks(): string[] {
  return readJSON<string[]>(ns(KEYS.bookmarks), []);
}
export function saveBookmarks(bookmarks: string[]): void {
  writeJSON(ns(KEYS.bookmarks), bookmarks);
  emitUserDataChange();
}

// ---------- Question overrides ----------
// Lets a user locally correct a question they believe is marked wrong, without touching
// the bundled config files. Overrides are merged onto the question at session-build time
// (see useSessionStore / lib/questionOverrides.ts). Stored per-user, keyed by question id.
// The shape intentionally only carries the bits a learner can plausibly want to fix:
// which option(s) are correct, a true/false answer, or a numeric answer + tolerance.
export interface QuestionOverride {
  correctOptions?: number[]; // indices of options marked correct (single/multiple)
  boolAnswer?: boolean; // truefalse
  numericAnswer?: number; // numeric
  numericTolerance?: number; // numeric
  gapAccept?: string[][]; // per-blank full list of accepted answers (gap) — replaces the original
  note?: string; // optional free-text note explaining the change, shown only to the editor
}
export type QuestionOverrides = Record<string, QuestionOverride>;

export function loadQuestionOverrides(): QuestionOverrides {
  return readJSON<QuestionOverrides>(ns(KEYS.questionOverrides), {});
}
export function saveQuestionOverrides(overrides: QuestionOverrides): void {
  writeJSON(ns(KEYS.questionOverrides), overrides);
  emitUserDataChange();
}
export function setQuestionOverride(questionId: string, override: QuestionOverride | null): QuestionOverrides {
  const all = loadQuestionOverrides();
  if (override === null) {
    delete all[questionId];
  } else {
    all[questionId] = override;
  }
  saveQuestionOverrides(all);
  return all;
}

// ---------- Imported configs ----------
export function loadImportedConfigs(): SubjectConfig[] {
  return readJSON<SubjectConfig[]>(ns(KEYS.importedConfigs), []);
}
export function saveImportedConfigs(configs: SubjectConfig[]): void {
  writeJSON(ns(KEYS.importedConfigs), configs);
}

// ---------- My (personally authored) questions ----------
// A user can build their own subject full of questions from inside the app (see
// MyQuestionsPage). These live in their own per-user slice, get merged into the loaded
// subject list under a "Moje otázky" group (see configLoader), and can optionally be
// submitted to the shared community pool below so other users can pick them up too.
export function loadMyConfigs(): SubjectConfig[] {
  return readJSON<SubjectConfig[]>(ns(KEYS.myConfigs), []);
}
export function saveMyConfigs(configs: SubjectConfig[]): void {
  writeJSON(ns(KEYS.myConfigs), configs);
}
/** Reads another user's personally authored subjects directly — used by the admin panel.
 *  This works because everything lives in the same browser's localStorage; it is NOT a
 *  security boundary (see the account notes above), just a per-user data convenience split. */
export function loadMyConfigsFor(username: string): SubjectConfig[] {
  return readJSON<SubjectConfig[]>(`mt:${username}:${KEYS.myConfigs}`, []);
}

// ---------- Community sharing pool ----------
// A small "marketplace" of user-submitted subjects. Submitting marks a subject as pending;
// an admin (see isUserAdmin) can flip it to public, after which every user can pick it up
// from the community browser and add it to their own subject list (a plain copy — it does
// not stay "live"-linked to the author).
export interface CommunitySubject {
  id: string; // stable id for this submission (not the same as the subject's own id)
  author: string;
  subjectId: string;
  name: string;
  config: SubjectConfig;
  public: boolean;
  sharedAt: number;
}

export function loadCommunitySubjects(): CommunitySubject[] {
  return readJSON<CommunitySubject[]>(GLOBAL_KEYS.community, []);
}
function saveCommunitySubjects(items: CommunitySubject[]): void {
  writeJSON(GLOBAL_KEYS.community, items);
}

/** Submits (or re-submits/updates) a subject to the community pool as the given author. */
export function shareSubjectToCommunity(author: string, config: SubjectConfig): CommunitySubject {
  const items = loadCommunitySubjects();
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
  saveCommunitySubjects(items);
  return entry;
}

/** Withdraws a previously shared subject (e.g. the author changed their mind). */
export function unshareSubjectFromCommunity(author: string, subjectId: string): void {
  const items = loadCommunitySubjects().filter((c) => !(c.author === author && c.subjectId === subjectId));
  saveCommunitySubjects(items);
}

/** Admin-only: flips the public visibility of a community submission. */
export function setCommunitySubjectPublic(id: string, isPublic: boolean): void {
  const items = loadCommunitySubjects();
  const idx = items.findIndex((c) => c.id === id);
  if (idx < 0) return;
  items[idx] = { ...items[idx], public: isPublic };
  saveCommunitySubjects(items);
}

/** Admin-only: permanently removes a community submission. */
export function removeCommunitySubject(id: string): void {
  saveCommunitySubjects(loadCommunitySubjects().filter((c) => c.id !== id));
}

// ---------- Sessions ----------
export function loadSessions(): SessionSummary[] {
  return readJSON<SessionSummary[]>(ns(KEYS.sessions), []);
}
export function appendSession(summary: SessionSummary): void {
  const sessions = loadSessions();
  sessions.push(summary);
  while (sessions.length > SESSIONS_CAP) sessions.shift();
  writeJSON(ns(KEYS.sessions), sessions);
  emitUserDataChange();
}

// ---------- Backup / restore ----------
export interface BackupData {
  version: number;
  exportedAt: number;
  progress: Record<string, Progress>;
  bookmarks: string[];
  sessions: SessionSummary[];
  settings: Settings;
}

export function exportBackup(): BackupData {
  return {
    version: 1,
    exportedAt: Date.now(),
    progress: loadProgress(),
    bookmarks: loadBookmarks(),
    sessions: loadSessions(),
    settings: loadSettings(),
  };
}

export function importBackup(data: BackupData): void {
  if (!data || typeof data !== 'object') throw new Error('Neplatný formát zálohy');
  if (data.progress) saveProgress(data.progress);
  if (data.bookmarks) saveBookmarks(data.bookmarks);
  if (data.sessions) writeJSON(ns(KEYS.sessions), data.sessions);
  if (data.settings) saveSettings(data.settings);
}

// ---------- Cross-device user-data snapshot ----------
// One bundle of everything that should follow a learner across devices. Pushed to / pulled from
// the server by src/lib/userDataSync.ts. `updatedAt` lets the sync layer pick the newer settings.
export interface UserDataSnapshot {
  progress: Record<string, Progress>;
  sessions: SessionSummary[];
  bookmarks: string[];
  settings: Settings;
  questionOverrides: QuestionOverrides;
  updatedAt: number;
}

/** Snapshots the active user's current syncable data from localStorage. */
export function collectUserData(): UserDataSnapshot {
  return {
    progress: loadProgress(),
    sessions: loadSessions(),
    bookmarks: loadBookmarks(),
    settings: loadSettings(),
    questionOverrides: loadQuestionOverrides(),
    updatedAt: Date.now(),
  };
}

/** Writes a (merged) snapshot back to the active user's localStorage. Suppresses change
 *  notifications so applying a pulled snapshot doesn't immediately trigger another push. */
export function applyUserData(data: Partial<UserDataSnapshot>): void {
  suppressUserDataChange = true;
  try {
    if (data.progress) saveProgress(data.progress);
    if (data.sessions) writeJSON(ns(KEYS.sessions), data.sessions.slice(-SESSIONS_CAP));
    if (data.bookmarks) saveBookmarks(data.bookmarks);
    if (data.settings) saveSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    if (data.questionOverrides) saveQuestionOverrides(data.questionOverrides);
  } finally {
    suppressUserDataChange = false;
  }
}

// ---------- Accounts (simple local login) ----------
// NOTE: this is intentionally lightweight — there is no backend, so "passwords" are only
// lightly obscured with a non-cryptographic hash. The goal is solely to let several people
// share one browser/device without stumbling into each other's progress, not to provide
// real account security. Don't reuse a sensitive password here.
export interface StoredUser {
  username: string;
  passwordHash: string;
  isAdmin?: boolean;
}

function hashPassword(password: string): string {
  // djb2-style string hash; deterministic, fast, good enough to obscure plain text locally.
  let hash = 5381;
  for (let i = 0; i < password.length; i++) {
    hash = (hash * 33) ^ password.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function loadUsers(): StoredUser[] {
  return readJSON<StoredUser[]>(GLOBAL_KEYS.users, []);
}
function saveUsers(users: StoredUser[]): void {
  writeJSON(GLOBAL_KEYS.users, users);
}

export function loadCurrentUser(): string | null {
  return readJSON<string | null>(GLOBAL_KEYS.currentUser, null);
}
export function saveCurrentUser(username: string | null): void {
  if (username === null) {
    try {
      localStorage.removeItem(GLOBAL_KEYS.currentUser);
    } catch {
      /* ignore */
    }
  } else {
    writeJSON(GLOBAL_KEYS.currentUser, username);
  }
}

/** Registers a new user. Returns an error message in Czech, or null on success. */
export function registerUser(username: string, password: string): string | null {
  const name = username.trim();
  if (name.length < 3) return 'Jméno musí mít alespoň 3 znaky.';
  if (password.length < 4) return 'Heslo musí mít alespoň 4 znaky.';
  const users = loadUsers();
  if (users.some((u) => u.username.toLowerCase() === name.toLowerCase())) {
    return 'Toto uživatelské jméno už existuje.';
  }
  // The very first account created on a device automatically becomes the admin — there's
  // no backend to configure this otherwise, and someone has to be able to curate shared content.
  const isAdmin = users.length === 0;
  users.push({ username: name, passwordHash: hashPassword(password), isAdmin });
  saveUsers(users);
  return null;
}

/** Returns whether the given username is an admin (case-insensitive).
 *  Falls back to "the very first registered account" when nobody is flagged yet —
 *  this covers accounts created before the admin flag existed (migration-free bootstrap). */
export function isUserAdmin(username: string | null): boolean {
  if (!username) return false;
  const users = loadUsers();
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return false;
  if (users.some((u) => u.isAdmin)) return !!user.isAdmin;
  return users[0]?.username.toLowerCase() === username.toLowerCase();
}

/** Verifies credentials. Returns an error message in Czech, or null on success. */
export function verifyUser(username: string, password: string): string | null {
  const name = username.trim();
  const users = loadUsers();
  const user = users.find((u) => u.username.toLowerCase() === name.toLowerCase());
  if (!user || user.passwordHash !== hashPassword(password)) {
    return 'Nesprávné jméno nebo heslo.';
  }
  return null;
}
