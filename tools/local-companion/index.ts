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
    // Bun's default idleTimeout is 10s, which is shorter than our SSE heartbeat
    // interval (15s) — without this override, every SSE connection is closed
    // before the first heartbeat can keep it alive. 60s is 4× the heartbeat
    // interval (comfortable margin) and still cleans up abandoned connections
    // within a minute.
    idleTimeout: 60,
  });

  // Subscribe a periodic SSE pump: nothing here for now — jobManager streams
  // events directly through its retained-event buffer.
  void server;
  logger.info('companion', `KnowAlong companion listening on http://${HOST}:${config.port}`);
  logger.info('companion', `Allowed origins: ${config.allowedOrigins.join(', ')}`);
  logger.info('companion', `Ollama base URL: ${config.ollamaBaseUrl}`);
}

void main();
