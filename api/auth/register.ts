import { createSession, createUser, findUser } from '../_lib/db.js';
import { readBody, requireConfigured, send, type Req, type Res, withErrorHandling } from '../_lib/http.js';

async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!(await requireConfigured(res))) return;

  const { username, password } = readBody<{ username?: string; password?: string }>(req);
  const name = (username ?? '').trim();
  const pass = password ?? '';

  if (name.length < 3) return send(res, 400, { error: 'Jméno musí mít alespoň 3 znaky.' });
  if (pass.length < 4) return send(res, 400, { error: 'Heslo musí mít alespoň 4 znaky.' });
  if (await findUser(name)) return send(res, 409, { error: 'Toto uživatelské jméno už na serveru existuje.' });

  const user = await createUser(name, pass);
  if (!user) return send(res, 409, { error: 'Toto uživatelské jméno už na serveru existuje.' });

  const token = await createSession(user.username);
  send(res, 200, { token, username: user.username, isAdmin: !!user.isAdmin });
}

export default withErrorHandling(handler);
