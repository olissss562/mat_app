import { unshareSubject } from '../_lib/db';
import { readBody, requireConfigured, requireUser, send, type Req, type Res } from '../_lib/http';

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!(await requireConfigured(res))) return;
  const user = await requireUser(req, res);
  if (!user) return;

  const { subjectId } = readBody<{ subjectId?: string }>(req);
  if (!subjectId) return send(res, 400, { error: 'Chybí "subjectId".' });

  await unshareSubject(user.username, subjectId);
  send(res, 200, { ok: true });
}
