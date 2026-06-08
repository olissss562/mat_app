import { loadMyConfigs, loadUsers } from '../_lib/db';
import { requireAdmin, requireConfigured, send, type Req, type Res, withErrorHandling } from '../_lib/http';

// Admin-only: full roster of server accounts plus a summary of each one's personally
// authored subjects (name + question count) — enough to review without dumping every
// question's full content over the wire.
async function handler(req: Req, res: Res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  if (!(await requireConfigured(res))) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const users = await loadUsers();
  const result = await Promise.all(
    users.map(async (u) => {
      const configs = await loadMyConfigs(u.username);
      return {
        username: u.username,
        isAdmin: !!u.isAdmin,
        subjects: configs.map((c) => ({ subject: c.subject, name: c.name, questionCount: c.questions.length })),
      };
    }),
  );

  send(res, 200, { users: result });
}

export default withErrorHandling(handler);
