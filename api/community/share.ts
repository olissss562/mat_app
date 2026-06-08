import { shareSubject } from '../_lib/db';
import { readBody, requireConfigured, requireUser, send, type Req, type Res, withErrorHandling } from '../_lib/http';
import { validateSubjectConfig } from '../_lib/validate';

async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!(await requireConfigured(res))) return;
  const user = await requireUser(req, res);
  if (!user) return;

  const { config } = readBody<{ config?: any }>(req);
  const validation = validateSubjectConfig(config, config?.subject);
  if (!validation.valid) {
    return send(res, 400, { error: 'Předmět není platný.', details: validation.errors });
  }

  const entry = await shareSubject(user.username, config);
  send(res, 200, { entry });
}

export default withErrorHandling(handler);
