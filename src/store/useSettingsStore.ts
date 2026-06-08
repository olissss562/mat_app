import { create } from 'zustand';
import { loadSettings, saveSettings, type AccentColor, type Settings } from '../lib/storage';

interface SettingsState extends Settings {
  setTheme: (theme: Settings['theme']) => void;
  setAccentColor: (accentColor: AccentColor) => void;
  setSound: (sound: boolean) => void;
  setAutoAdvance: (autoAdvance: boolean) => void;
  setLastSubject: (subjectId: string) => void;
  reloadFromStorage: () => void;
}

const initial = loadSettings();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initial,
  setTheme: (theme) => {
    set({ theme });
    saveSettings({ ...get(), theme });
  },
  setAccentColor: (accentColor) => {
    set({ accentColor });
    saveSettings({ ...get(), accentColor });
  },
  setSound: (sound) => {
    set({ sound });
    saveSettings({ ...get(), sound });
  },
  setAutoAdvance: (autoAdvance) => {
    set({ autoAdvance });
    saveSettings({ ...get(), autoAdvance });
  },
  setLastSubject: (lastSubject) => {
    set({ lastSubject });
    saveSettings({ ...get(), lastSubject });
  },
  // Re-reads settings from the (now active-user-namespaced) storage. Call this right after
  // login/logout so the newly active user's saved theme/accent/etc. take effect immediately.
  reloadFromStorage: () => {
    set(loadSettings());
  },
}));

export function resolveEffectiveTheme(theme: Settings['theme']): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export const ACCENT_COLORS: { id: AccentColor; label: string; swatch: string }[] = [
  { id: 'violet', label: 'Fialová', swatch: '#7c3aed' },
  { id: 'blue', label: 'Modrá', swatch: '#2563eb' },
  { id: 'emerald', label: 'Zelená', swatch: '#059669' },
  { id: 'rose', label: 'Růžová', swatch: '#e11d48' },
  { id: 'amber', label: 'Oranžová', swatch: '#d97706' },
];
