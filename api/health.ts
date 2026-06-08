// Minimal diagnostic endpoint with NO imports from anywhere — if this still crashes
// with FUNCTION_INVOCATION_FAILED, the problem is in how Vercel builds/runs functions
// from this /api directory in general (e.g. tsconfig/runtime), not in our code/imports.
export default function handler(_req: any, res: any) {
  res.status(200).json({ ok: true, ts: Date.now() });
}
