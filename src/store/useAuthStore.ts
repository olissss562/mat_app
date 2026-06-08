import { create } from 'zustand';
import {
  isUserAdmin,
  loadCurrentUser,
  loadServerSession,
  registerUser,
  saveCurrentUser,
  saveServerSession,
  setActiveUser,
  verifyUser,
} from '../lib/storage';
import { serverLogin, serverRegister } from '../lib/serverApi';
import { useSettingsStore } from './useSettingsStore';

// Settings (theme, accent color, sound, auto-advance, ...) are stored per-user (namespaced
// in storage.ts). Whenever the active user changes we must re-read them from the newly
// active namespace, otherwise the previous user's in-memory settings would leak through.
function syncSettingsToActiveUser(): void {
  useSettingsStore.getState().reloadFromStorage();
}

interface AuthState {
  username: string | null;
  isAdmin: boolean;
  token: string | null; // server session token, when a backend is configured & reachable
  ready: boolean; // true once we've checked for a remembered session
  error: string | null;
  init: () => void;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

// Applies a successful sign-in (local or server) to the shared app state/namespacing.
function applySession(set: (partial: Partial<AuthState>) => void, name: string, token: string | null, serverIsAdmin?: boolean) {
  setActiveUser(name);
  saveCurrentUser(name);
  if (token) saveServerSession(name, token);
  syncSettingsToActiveUser();
  const isAdmin = serverIsAdmin ?? isUserAdmin(name);
  set({ username: name, isAdmin, token, error: null });
}

export const useAuthStore = create<AuthState>((set) => ({
  username: null,
  isAdmin: false,
  token: null,
  ready: false,
  error: null,

  init: () => {
    const remembered = loadCurrentUser();
    if (remembered) {
      setActiveUser(remembered);
      syncSettingsToActiveUser();
      const session = loadServerSession(remembered);
      set({ username: remembered, isAdmin: isUserAdmin(remembered), token: session?.token ?? null, ready: true });
    } else {
      set({ ready: true });
    }
  },

  login: async (username, password) => {
    const name = username.trim();

    // Prefer the server (works across devices) when it's reachable & configured.
    const serverResult = await serverLogin(name, password);
    if (serverResult.ok) {
      applySession(set, serverResult.data.username, serverResult.data.token, serverResult.data.isAdmin);
      return true;
    }

    if (serverResult.reason === 'not-configured' || serverResult.reason === 'network') {
      // No backend available (e.g. local dev preview, or Redis not provisioned yet) —
      // fall back to the original local-only accounts so the app keeps working.
      const error = verifyUser(name, password);
      if (error) {
        set({ error });
        return false;
      }
      applySession(set, name, null);
      return true;
    }

    if (serverResult.reason === 'unauthorized') {
      // Could be a pre-existing local-only account that was never migrated to the server.
      // If the local credentials check out, log in locally and silently create a matching
      // server account so future logins (and cross-device sharing) work going forward.
      const localError = verifyUser(name, password);
      if (!localError) {
        const migrated = await serverRegister(name, password);
        if (migrated.ok) {
          applySession(set, migrated.data.username, migrated.data.token, migrated.data.isAdmin);
        } else {
          applySession(set, name, null);
        }
        return true;
      }
    }

    set({ error: serverResult.error });
    return false;
  },

  register: async (username, password) => {
    const name = username.trim();

    const serverResult = await serverRegister(name, password);
    if (serverResult.ok) {
      applySession(set, serverResult.data.username, serverResult.data.token, serverResult.data.isAdmin);
      // Also create a matching local account so things keep working if the backend
      // later becomes unreachable (e.g. offline use).
      registerUser(name, password);
      return true;
    }

    if (serverResult.reason === 'not-configured' || serverResult.reason === 'network') {
      const error = registerUser(name, password);
      if (error) {
        set({ error });
        return false;
      }
      applySession(set, name, null);
      return true;
    }

    set({ error: serverResult.error });
    return false;
  },

  logout: () => {
    setActiveUser(null);
    saveCurrentUser(null);
    syncSettingsToActiveUser();
    set({ username: null, isAdmin: false, token: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
