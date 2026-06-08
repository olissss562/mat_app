// Diagnostic: imports our actual _lib/db module (same one auth/login uses) and
// exercises redis()/isConfigured()/a real GET, with each step reported separately
// so we can see exactly which step crashes.
import { isConfigured, redis } from './_lib/db';

export default async function handler(_req: any, res: any) {
  const steps: Record<string, unknown> = {};
  try {
    steps.isConfigured = isConfigured();
  } catch (err) {
    steps.isConfiguredError = err instanceof Error ? err.message + '\n' + err.stack : String(err);
    return res.status(200).json({ steps });
  }
  try {
    const r = redis();
    steps.redisClient = r ? 'created' : 'null';
    if (r) {
      const value = await r.get('mt:server:users');
      steps.getResult = value === null ? 'null' : typeof value;
    }
  } catch (err) {
    steps.redisError = err instanceof Error ? err.message + '\n' + err.stack : String(err);
  }
  res.status(200).json({ steps });
}
