import { loadCommunity } from '../_lib/db';
import { isConfigured, requireUser } from '../_lib/http';
import { send, type Req, type Res } from '../_lib/http';

// Returns the public community pool. If the caller is logged in, also include their
// own (possibly still-pending) submissions so "Moje otázky" can show accurate status.
export default async function handler(req: Req, res: Res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  if (!isConfigured()) return send(res, 200, { items: [] });

  const all = await loadCommunity();
  const user = await requireUserOptional(req);
  const items = all.filter((c) => c.public || (user && c.author === user.username));
  send(res, 200, { items });
}

async function requireUserOptional(req: Req) {
  // Soft variant of requireUser that doesn't write an error response on failure —
  // anonymous visitors can still see the public pool.
  const header = req.headers['authorization'];
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return null;
  const fakeRes = {
    status: () => fakeRes,
    json: () => {},
    setHeader: () => {},
    end: () => {},
  };
  return requireUser(req, fakeRes as any);
}
