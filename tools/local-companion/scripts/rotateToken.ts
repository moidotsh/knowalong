// tools/local-companion/scripts/rotateToken.ts
// Generate a fresh token and write it to the config file (replacing the old).
// Prints the new token once. After running, the user must re-paste the new
// token into the PWA /settings/companion.

import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { _configPathForTests } from '../config';

async function main() {
  const path = _configPathForTests();
  const raw = await readFile(path, 'utf-8');
  const cfg = JSON.parse(raw);
  const newToken = randomBytes(32).toString('hex');
  cfg.token = newToken;
  await writeFile(path, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  process.stdout.write(`\n[KNOWALONG COMPANION] Token rotated.\n`);
  process.stdout.write(`[KNOWALONG COMPANION] NEW TOKEN (paste into the PWA /settings/companion once):\n`);
  process.stdout.write(`    ${newToken}\n`);
  process.stdout.write(`[KNOWALONG COMPANION] Restart the companion for the new token to take effect.\n\n`);
}

void main();
