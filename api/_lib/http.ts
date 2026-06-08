// Tiny helpers shared by the serverless functions in /api. We deliberately avoid
// pulling in @vercel/node's types (one less dependency) — Vercel's Node runtime
// passes plain Node IncomingMessage/ServerResponse-like objects that behave the
// same way for our purposes.

import { isConfigured, resolveSession, seedAdmin, type ServerUser } from './db';

export type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: any;
  query?: Record<string, string | string[] | undefined>;
};
export type Res = {
  status: (code: number) => Res;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
};

export function send(res: Res, status: number, body: unknown): void {
  res.status(status).json(body);
}

export function notConfigured(res: Res): void {
  send(res, 503, {
    error:
      'Sdílené úložiště na serveru není nakonfigurované. Přidejte v nastavení Vercel projektu databázi ' +
      '"Upstash Redis" (Storage → Marketplace) a znovu nasaďte aplikaci — viz docs/server-sharing-setup.md.',
  });
}

export async function requireConfigured(res: Res): Promise<boolean> {
  if (!isConfigured()) {
    notConfigured(res);
    return false;
  }
  await seedAdmin();
  return true;
}

function bearerToken(req: Req): string | null {
  const header = req.headers['authorization'];
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return null;
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match ? match[1] : null;
}

export async function requireUser(req: Req, res: Res): Promise<ServerUser | null> {
  const user = await resolveSession(bearerToken(req));
  if (!user) {
    send(res, 401, { error: 'Nejste přihlášeni (neplatný nebo chybějící token).' });
    return null;
  }
  return user;
}

export async function requireAdmin(req: Req, res: Res): Promise<ServerUser | null> {
  const user = await requireUser(req, res);
  if (!user) return null;
  if (!user.isAdmin) {
    send(res, 403, { error: 'Tato akce je dostupná jen administrátorovi.' });
    return null;
  }
  return user;
}

export function readBody<T = any>(req: Req): T {
  if (!req.body) return {} as T;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      return {} as T;
    }
  }
  return req.body as T;
}
