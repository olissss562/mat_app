// Diagnostic endpoint that imports @upstash/redis and reads env vars, but does NOT
// construct a client or hit the network. Helps isolate whether the crash comes from
// loading the @upstash/redis package itself vs. our own code/env.
import { Redis } from '@upstash/redis';

export default function handler(_req: any, res: any) {
  const hasUrl = !!(process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL);
  const hasToken = !!(process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN);
  res.status(200).json({
    ok: true,
    redisImported: typeof Redis,
    hasUrl,
    hasToken,
    nodeVersion: process.version,
  });
}
