import { createSession, findUser, hashPassword } from '../_lib/db.js';
import { readBody, requireConfigured, send, type Req, type Res, withErrorHandling } from '../_lib/http.js';

async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!(await requireConfigured(res))) return;

  const { username, password } = readBody<{ username?: string; password?: string }>(req);
  const name = (username ?? '').trim();
  const user = await findUser(name);

  if (!user || user.passwordHash !== hashPassword(password ?? '')) {
    return send(res, 401, { error: 'Nesprávné jméno nebo heslo.' });
  }

  const token = await createSession(user.username);
  send(res, 200, { token, username: user.username, isAdmin: !!user.isAdmin });
}

export default withErrorHandling(handler);
