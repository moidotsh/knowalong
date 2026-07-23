// supabase/functions/_shared/cors.ts
// Shared CORS headers for edge functions.
//
// Fail-closed by default. If CORS_ORIGIN is unset, cross-origin browser
// requests are refused — the Access-Control-Allow-Origin header is omitted,
// which browsers treat as a rejection. Production MUST set CORS_ORIGIN
// explicitly to the allowed origin(s). Same-origin requests and non-browser
// clients (server-to-server, native HTTP) send no Origin header and are
// unaffected because they never needed the header.
//
// Configure CORS_ORIGIN as:
//   - Single origin: "https://example.com"
//   - Multiple origins: "https://example.com,https://app.example.com"
//   - Explicit wildcard opt-in (discouraged): "*"

if (!Deno.env.get('CORS_ORIGIN')) {
  console.warn(
    '[cors] CORS_ORIGIN is not set — cross-origin browser requests will be refused. Set CORS_ORIGIN in production to the allowed origin(s).',
  );
}

/**
 * Resolve the Access-Control-Allow-Origin value for a request.
 *
 * Returns the origin string to send back, or null to refuse the
 * cross-origin request (browser blocks; same-origin and native clients
 * are unaffected because they never needed the header).
 */
function resolveAllowedOrigin(requestOrigin: string | null): string | null {
  const configured = Deno.env.get('CORS_ORIGIN');

  // Unset → fail-closed.
  if (!configured) return null;

  // Explicit wildcard opt-in.
  if (configured === '*') return '*';

  // Comma-separated allowlist; echo the request origin only on match.
  const origins = configured.split(',').map((o) => o.trim()).filter(Boolean);
  if (requestOrigin && origins.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Configured but no match → fail-closed.
  return null;
}

/**
 * Get CORS headers for a request.
 *
 * @param req - The incoming request to get origin from
 * @returns CORS headers object. Access-Control-Allow-Origin is omitted
 *          when the request origin is not allowed (fail-closed).
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const requestOrigin = req.headers.get('Origin');
  const allowedOrigin = resolveAllowedOrigin(requestOrigin);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  };

  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
  }

  return headers;
}
