// tools/local-companion/index.ts
// Bun.serve entry point. Binds 127.0.0.1 ONLY — refuses 0.0.0.0. Single-flight.
// All routes except /health require Bearer auth; CORS is a strict allowlist
// (no wildcard, no reflection). The companion NEVER writes to Supabase.

import { loadConfig, DEFAULT_LOOPBACK_HOST } from './config';
import { makeRouter } from './router';
import { jobManager } from './jobManager';
import { logger } from '../../utils/logger';

const HOST = DEFAULT_LOOPBACK_HOST; // Always 127.0.0.1.

async function main() {
  const config = await loadConfig();
  const router = makeRouter({ config, jobManager });

  const server = Bun.serve({
    hostname: HOST,
    port: config.port,
    fetch: router,
  });

  // Subscribe a periodic SSE pump: nothing here for now — jobManager streams
  // events directly through its retained-event buffer.
  void server;
  logger.info('companion', `KnowAlong companion listening on http://${HOST}:${config.port}`);
  logger.info('companion', `Allowed origins: ${config.allowedOrigins.join(', ')}`);
  logger.info('companion', `Ollama base URL: ${config.ollamaBaseUrl}`);
}

void main();
