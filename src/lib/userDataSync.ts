import {
  applyUserData,
  collectUserData,
  setUserDataChangeHandler,
  type UserDataSnapshot,
} from './storage';
import { serverLoadUserData, serverSaveUserData } from './serverApi';
import type { Progress } from './srs';
import type { SessionSummary } from './storage';

// Orchestrates cross-device sync of a learner's data (progress / sessions / bookmarks / settings /
// answer overrides). On login we pull the server copy, merge it with whatever is on this device so
// nothing is lost, write the merged result back locally, and push it up. From then on any local
// change is pushed (debounced). Everything here is best-effort: if the backend isn't configured or
// is unreachable, the app keeps working purely from localStorage.

const PUSH_DEBOUNCE_MS = 1500;

let currentToken: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let onApplied: (() => void) | null = null;

// ---- merge helpers ----

/** Merge SM-2 progress per question id, keeping whichever copy was reviewed more recently. */
function mergeProgress(
  a: Record<string, Progress>,
  b: Record<string, Progress>,
): Record<string, Progress> {
  const out: Record<string, Progress> = { ...a };
  for (const [id, bp] of Object.entries(b)) {
    const ap = out[id];
    if (!ap) {
      out[id] = bp;
      continue;
    }
    // Prefer the more recently reviewed entry; tie-break on more reviews seen.
    if (bp.lastReviewed > ap.lastReviewed || (bp.lastReviewed === ap.lastReviewed && bp.totalSeen > ap.totalSeen)) {
      out[id] = bp;
    }
  }
  return out;
}

/** Union session summaries by id, newest first, capped to a reasonable history length. */
function mergeSessions(a: SessionSummary[], b: SessionSummary[], cap = 50): SessionSummary[] {
  const byId = new Map<string, SessionSummary>();
  for (const s of [...a, ...b]) byId.set(s.id, s);
  return Array.from(byId.values())
    .sort((x, y) => y.timestamp - x.timestamp)
    .slice(0, cap);
}

/**
 * Merge a local snapshot with a remote one. Progress/sessions/bookmarks/overrides are unioned so
 * activity from any device is preserved. Settings have no per-field timestamp, so the caller
 * decides via `preferRemoteSettings` (true on first login pull, so a fresh device adopts the
 * user's saved theme/preferences).
 */
function mergeUserData(
  local: UserDataSnapshot,
  remote: Partial<UserDataSnapshot> | null,
  preferRemoteSettings: boolean,
): UserDataSnapshot {
  if (!remote) return local;
  return {
    progress: mergeProgress(local.progress ?? {}, remote.progress ?? {}),
    sessions: mergeSessions(local.sessions ?? [], remote.sessions ?? []),
    bookmarks: Array.from(new Set([...(local.bookmarks ?? []), ...(remote.bookmarks ?? [])])),
    // Local overrides win per key (the freshest correction the user made on this device), but
    // remote-only corrections are kept too.
    questionOverrides: { ...(remote.questionOverrides ?? {}), ...(local.questionOverrides ?? {}) },
    settings:
      preferRemoteSettings && remote.settings ? remote.settings : local.settings,
    updatedAt: Date.now(),
  };
}

// ---- push (debounced) ----

function schedulePush(): void {
  if (!currentToken) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushNow();
  }, PUSH_DEBOUNCE_MS);
}

async function pushNow(): Promise<void> {
  if (!currentToken) return;
  const snapshot = collectUserData();
  await serverSaveUserData(currentToken, snapshot);
}

// ---- public API ----

/**
 * Begin syncing for the given server session token. Pulls + merges the server copy, applies it
 * locally, pushes the merged result back, and starts mirroring future local changes to the server.
 * `onAppliedCb` runs after a pull is applied so the UI can refresh (e.g. reload settings).
 */
export async function startUserDataSync(token: string, onAppliedCb?: () => void): Promise<void> {
  currentToken = token;
  onApplied = onAppliedCb ?? null;

  // Mirror future local changes to the server (debounced).
  setUserDataChangeHandler(() => schedulePush());

  // Initial pull + merge.
  const result = await serverLoadUserData<Partial<UserDataSnapshot>>(token);
  // If the token changed/cleared while we were awaiting, abort.
  if (currentToken !== token) return;

  if (result.ok) {
    const local = collectUserData();
    const merged = mergeUserData(local, result.data.data, /* preferRemoteSettings */ true);
    applyUserData(merged);
    onApplied?.();
    // Push the merged result so the server reflects this device's activity too.
    await serverSaveUserData(token, collectUserData());
  } else if (result.reason === 'not-configured' || result.reason === 'unauthorized') {
    // No usable backend for this token — disable syncing so we don't fire pointless requests.
    // Local data stays fully intact and the app keeps working offline.
    setUserDataChangeHandler(null);
    if (currentToken === token) currentToken = null;
  } else {
    // Transient network/error: keep the change handler so the next local change retries a push.
  }
}

/** Stop syncing (on logout / token change). We intentionally do NOT flush here: by the time this
 *  runs the active-user namespace may already have been cleared/switched, so collecting now could
 *  capture the wrong user's data. The short push debounce means changes are mirrored promptly while
 *  the session is live, so at most the last sub-second of activity is deferred to the next login. */
export function stopUserDataSync(): void {
  setUserDataChangeHandler(null);
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  currentToken = null;
  onApplied = null;
}
