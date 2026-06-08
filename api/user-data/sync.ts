import { loadUserData, saveUserData } from '../_lib/db.js';
import { readBody, requireConfigured, requireUser, send, type Req, type Res, withErrorHandling } from '../_lib/http.js';

// Lets a logged-in user pull/push their learning data (SM-2 progress, session history,
// bookmarks, settings, answer overrides) so it follows them across devices. The payload is an
// opaque JSON blob defined by the client (src/lib/storage.ts UserDataSnapshot); the client is
// responsible for merging server + local before pushing back.
async function handler(req: Req, res: Res) {
  if (!(await requireConfigured(res))) return;
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const data = await loadUserData(user.username);
    return send(res, 200, { data });
  }

  if (req.method === 'POST') {
    const { data } = readBody<{ data?: unknown }>(req);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return send(res, 400, { error: 'Očekával se objekt "data".' });
    }
    await saveUserData(user.username, data as Record<string, unknown>);
    return send(res, 200, { ok: true });
  }

  send(res, 405, { error: 'Method not allowed' });
}

export default withErrorHandling(handler);
