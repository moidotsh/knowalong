// supabase/functions/_shared/supabase-client.ts
// Shared Supabase service-client setup for edge functions.
//
// Handles:
//   - env var reads (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_INTERNAL_JWT_SECRET)
//   - local-dev fallback for the JWT secret when running under `supabase functions serve`
//   - ES256 -> HS256 service-role key rewrite (local PostgREST uses HS256)
//   - createClient(...) call
//
// See `CreateClientOptions` for the per-function knobs. Each caller is
// responsible for passing options that match its intended behavior.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const DEV_FALLBACK_SECRET =
  'super-secret-jwt-token-with-at-least-32-characters-long';

export type CreateClientOptions = {
  /** Tag used in console logs, e.g. 'track-rpc'. */
  loggerTag: string;
  /** URL substrings that indicate local dev (default: ['kong:8000']). */
  devFallbackUrls?: string[];
  /**
   * If true, return an error Response when SUPABASE_INTERNAL_JWT_SECRET
   * is missing in a local-dev environment, instead of using the fallback.
   * Default: false (use fallback).
   */
  strictDevSecret?: boolean;
};

export type CreateClientResult =
  | { ok: true; client: SupabaseClient }
  | { ok: false; errorResponse: Response };

function base64UrlEncode(obj: unknown): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Build a service-role Supabase client, rewriting an ES256 service-role key
 * to HS256 when running against local PostgREST.
 *
 * Returns `{ ok: false, errorResponse }` only when `strictDevSecret` is true
 * and the JWT secret is missing in a local-dev environment. The caller
 * should return that Response immediately.
 */
export async function createSupabaseServiceClient(
  options: CreateClientOptions,
): Promise<CreateClientResult> {
  const tag = options.loggerTag;
  const devFallbackUrls = options.devFallbackUrls ?? ['kong:8000'];
  const strictDevSecret = options.strictDevSecret ?? false;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  let supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  let internalJwtSecret = Deno.env.get('SUPABASE_INTERNAL_JWT_SECRET');

  const isDevUrl = devFallbackUrls.some((substr) => supabaseUrl.includes(substr));

  if (!internalJwtSecret && isDevUrl) {
    if (strictDevSecret) {
      console.error(
        `[${tag}] Missing SUPABASE_INTERNAL_JWT_SECRET for local development`,
      );
      return {
        ok: false,
        errorResponse: new Response(
          JSON.stringify({
            success: false,
            error: 'Server configuration error',
          }),
          {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          },
        ),
      };
    }

    console.log(
      `[${tag}] SUPABASE_INTERNAL_JWT_SECRET not found, using fallback for local dev`,
    );
    internalJwtSecret = DEV_FALLBACK_SECRET;
  }

  if (internalJwtSecret) {
    try {
      const [headerB64] = supabaseKey.split('.');
      const header = JSON.parse(atob(headerB64));

      if (header.alg === 'ES256') {
        console.log(
          `[${tag}] Current key is ES256, generating HS256 service role key`,
        );

        const now = Math.floor(Date.now() / 1000);
        const payload = {
          iss: 'supabase-demo',
          role: 'service_role',
          iat: now,
          exp: now + 365 * 24 * 60 * 60, // 1 year
        };
        const headerHS256 = { alg: 'HS256', typ: 'JWT' };

        const encodedHeader = base64UrlEncode(headerHS256);
        const encodedPayload = base64UrlEncode(payload);
        const dataToSign = `${encodedHeader}.${encodedPayload}`;
        const signature = await hmacSha256(internalJwtSecret, dataToSign);

        supabaseKey = `${dataToSign}.${signature}`;
      }
    } catch (error) {
      console.error(`[${tag}] Error checking/generating HS256 key:`, error);
    }
  }

  console.debug(`[${tag}] Supabase URL:`, supabaseUrl);

  return { ok: true, client: createClient(supabaseUrl, supabaseKey) };
}
