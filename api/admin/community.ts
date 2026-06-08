import { loadCommunity, removeCommunityEntry, setCommunityPublic } from '../_lib/db';
import { readBody, requireAdmin, requireConfigured, send, type Req, type Res, withErrorHandling } from '../_lib/http';

// Admin-only: list every submission (pending + public) and act on it (publish/unpublish/remove).
async function handler(req: Req, res: Res) {
  if (!(await requireConfigured(res))) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    const items = await loadCommunity();
    return send(res, 200, { items });
  }

  if (req.method === 'POST') {
    const { action, id, public: makePublic } = readBody<{ action?: string; id?: string; public?: boolean }>(req);
    if (!id) return send(res, 400, { error: 'Chybí "id".' });

    if (action === 'set-public') {
      const ok = await setCommunityPublic(id, !!makePublic);
      if (!ok) return send(res, 404, { error: 'Sdílený předmět nenalezen.' });
      return send(res, 200, { ok: true });
    }
    if (action === 'remove') {
      await removeCommunityEntry(id);
      return send(res, 200, { ok: true });
    }
    return send(res, 400, { error: 'Neznámá akce.' });
  }

  send(res, 405, { error: 'Method not allowed' });
}

export default withErrorHandling(handler);
