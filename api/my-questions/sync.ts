import { loadMyConfigs, saveMyConfigs } from '../_lib/db.js';
import { readBody, requireConfigured, requireUser, send, type Req, type Res, withErrorHandling } from '../_lib/http.js';

// Lets a logged-in user pull/push their personally authored subjects to the server so:
//  (a) the same set is available no matter which device they're on, and
//  (b) the admin panel can show what each user has created.
// Mirrors the localStorage "myConfigs" shape 1:1 — the client merges the two.
async function handler(req: Req, res: Res) {
  if (!(await requireConfigured(res))) return;
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const configs = await loadMyConfigs(user.username);
    return send(res, 200, { configs });
  }

  if (req.method === 'POST') {
    const { configs } = readBody<{ configs?: unknown }>(req);
    if (!Array.isArray(configs)) return send(res, 400, { error: 'Očekávalo se pole "configs".' });
    await saveMyConfigs(user.username, configs as any);
    return send(res, 200, { ok: true });
  }

  send(res, 405, { error: 'Method not allowed' });
}

export default withErrorHandling(handler);
