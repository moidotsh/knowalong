// tools/local-companion/config.ts
// Reads the companion config file (gitignored, 0600). On first start, if
// the file is missing, generates a fresh token + writes a default config.
// The token is the companion's; the PWA only stores a client copy.

import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

const CONFIG_PATH = process.env.KNOWALONG_COMPANION_CONFIG ?? join(process.cwd(), 'tools/local-companion/config/companion.local.json');

export const DEFAULT_LOOPBACK_HOST = '127.0.0.1';
export const DEFAULT_LOOPBACK_PORT = 8765;
const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_ALLOWED_ORIGIN_DEV = 'http://localhost:8081';
const DEFAULT_ALLOWED_ORIGIN_LOOPBACK = 'http://127.0.0.1:8081';
const DEFAULT_MODEL = 'llama3.2:3b';

const CompanionConfigSchema = z.object({
  token: z.string().min(32, 'Token must be at least 32 chars (256 bits).'),
  allowedOrigins: z.array(z.string().url()).min(1, 'At least one allowed origin required.'),
  defaultModel: z.string().min(1),
  ollamaBaseUrl: z.string().url().default(DEFAULT_OLLAMA_BASE_URL),
  port: z.number().int().min(1).max(65535).default(DEFAULT_LOOPBACK_PORT),
});

export type CompanionConfig = z.infer<typeof CompanionConfigSchema>;

let cachedConfig: CompanionConfig | null = null;

function generateToken(): string {
  // 32 random bytes hex-encoded = 64-char string (256 bits of entropy).
  return randomBytes(32).toString('hex');
}

function defaultConfig(): CompanionConfig {
  return {
    token: generateToken(),
    allowedOrigins: [DEFAULT_ALLOWED_ORIGIN_DEV, DEFAULT_ALLOWED_ORIGIN_LOOPBACK],
    defaultModel: DEFAULT_MODEL,
    ollamaBaseUrl: DEFAULT_OLLAMA_BASE_URL,
    port: DEFAULT_LOOPBACK_PORT,
  };
}

async function ensureConfigFile(): Promise<void> {
  try {
    await stat(CONFIG_PATH);
    return; // exists
  } catch {
    // not present — create.
  }
  const cfg = defaultConfig();
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  // IMPORTANT: print the token ONCE so the user can paste it into the PWA.
  // After this, the token is only ever read from the file.
  process.stdout.write(`\n[KNOWALONG COMPANION] First-run setup.\n`);
  process.stdout.write(`[KNOWALONG COMPANION] Wrote ${CONFIG_PATH} (mode 0600).\n`);
  process.stdout.write(`[KNOWALONG COMPANION] TOKEN (paste into the PWA /settings/companion once):\n`);
  process.stdout.write(`    ${cfg.token}\n\n`);
}

export async function loadConfig(): Promise<CompanionConfig> {
  if (cachedConfig) return cachedConfig;
  await ensureConfigFile();
  const raw = await readFile(CONFIG_PATH, 'utf-8');
  const parsed: unknown = JSON.parse(raw);
  cachedConfig = CompanionConfigSchema.parse(parsed);
  return cachedConfig;
}

/** Test-only: invalidate the cache so the next load reads the file again. */
export function _resetConfigCacheForTests(): void {
  cachedConfig = null;
}

/** Test-only: get the config path the module is using. */
export function _configPathForTests(): string {
  return CONFIG_PATH;
}
