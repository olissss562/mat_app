import type { Progress } from './srs';
import type { SubjectConfig } from '../types/config';

const KEYS = {
  progress: 'mt:progress',
  settings: 'mt:settings',
  bookmarks: 'mt:bookmarks',
  importedConfigs: 'mt:importedConfigs',
  sessions: 'mt:sessions',
} as const;

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  sound: boolean;
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

// ---------- Progress ----------
export function loadProgress(): Record<string, Progress> {
  return readJSON<Record<string, Progress>>(KEYS.progress, {});
}
export function saveProgress(progress: Record<string, Progress>): void {
  writeJSON(KEYS.progress, progress);
}

// ---------- Settings ----------
const DEFAULT_SETTINGS: Settings = { theme: 'system', sound: true };
export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readJSON<Partial<Settings>>(KEYS.settings, {}) };
}
export function saveSettings(settings: Settings): void {
  writeJSON(KEYS.settings, settings);
}

// ---------- Bookmarks ----------
export function loadBookmarks(): string[] {
  return readJSON<string[]>(KEYS.bookmarks, []);
}
export function saveBookmarks(bookmarks: string[]): void {
  writeJSON(KEYS.bookmarks, bookmarks);
}

// ---------- Imported configs ----------
export function loadImportedConfigs(): SubjectConfig[] {
  return readJSON<SubjectConfig[]>(KEYS.importedConfigs, []);
}
export function saveImportedConfigs(configs: SubjectConfig[]): void {
  writeJSON(KEYS.importedConfigs, configs);
}

// ---------- Sessions ----------
export function loadSessions(): SessionSummary[] {
  return readJSON<SessionSummary[]>(KEYS.sessions, []);
}
export function appendSession(summary: SessionSummary): void {
  const sessions = loadSessions();
  sessions.push(summary);
  while (sessions.length > SESSIONS_CAP) sessions.shift();
  writeJSON(KEYS.sessions, sessions);
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
  if (data.sessions) writeJSON(KEYS.sessions, data.sessions);
  if (data.settings) saveSettings(data.settings);
}
