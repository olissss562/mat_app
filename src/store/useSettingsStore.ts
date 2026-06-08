import { create } from 'zustand';
import { loadSettings, saveSettings, type Settings } from '../lib/storage';

interface SettingsState extends Settings {
  setTheme: (theme: Settings['theme']) => void;
  setSound: (sound: boolean) => void;
  setLastSubject: (subjectId: string) => void;
}

const initial = loadSettings();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initial,
  setTheme: (theme) => {
    set({ theme });
    saveSettings({ ...get(), theme });
  },
  setSound: (sound) => {
    set({ sound });
    saveSettings({ ...get(), sound });
  },
  setLastSubject: (lastSubject) => {
    set({ lastSubject });
    saveSettings({ ...get(), lastSubject });
  },
}));

export function resolveEffectiveTheme(theme: Settings['theme']): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}
