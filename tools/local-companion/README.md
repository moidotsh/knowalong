# KnowAlong Local Companion

An optional, user-run local service that wraps [Ollama](https://ollama.com) to perform
language-analysis work for KnowAlong. The companion is **loopback-only** (binds
`127.0.0.1`), **opt-in**, and **never writes to Supabase** — the PWA owns every
database write.

## Why a companion?

KnowAlong's analysis workflow (source-text analysis + CLCC language-pack
population) benefits from a local LLM. Running the model locally keeps user
content on the user's machine, avoids cloud API costs, and keeps the product
honest about its private-content boundary.

The PWA cannot host a model in the browser; the companion is the bridge.

## Security model

- **Loopback-only.** The server binds `127.0.0.1:8765`. It refuses to start
  on `0.0.0.0`.
- **Companion owns its token.** On first start, the companion generates a
  256-bit token, writes it to `config/companion.local.json` (mode `0600`,
  gitignored), and prints it once. The PWA only ever **stores a client copy**
  of the token; it never generates one.
- **Strict CORS allowlist.** No wildcard origin. No reflection. Only origins
  listed in `allowedOrigins` are accepted; everything else gets `403
  origin-forbidden`. Absent `Origin` (curl, CLI) is allowed.
- **Bearer auth on every route except `/health`.** Constant-time compare.
- **Body size limit 256KB.**
- **No Supabase access.** The companion has no DB client, no service-role
  key, no anon key. Its only outputs are SSE event streams and JSON job
  results.

## First run

```bash
# From the repository root:
bun install
cd tools/local-companion
bun run dev
```

On first start, the companion prints a banner containing the token exactly
once:

```
────────────────────────────────────────────────────────────
  KnowAlong local companion
  Loopback: http://127.0.0.1:8765
  Token:    <64 hex chars>
  Config:   /abs/path/to/tools/local-companion/config/companion.local.json
────────────────────────────────────────────────────────────
```

Copy the token. In the PWA, open `Settings → Companion`, paste the token,
optionally adjust the base URL, and click **Test connection**.

If you lose the token, rotate it:

```bash
cd tools/local-companion
bun run rotate-token
```

This generates a fresh token and prints it once. The old token stops working
immediately.

## Configuration

The config file lives at `tools/local-companion/config/companion.local.json`
(gitignored, mode `0600`):

```json
{
  "token": "<64+ hex chars>",
  "allowedOrigins": ["http://localhost:8081", "http://127.0.0.1:8081"],
  "defaultModel": "llama3.2:3b",
  "ollamaBaseUrl": "http://127.0.0.1:11434",
  "port": 8765
}
```

### Allowed origins

The companion will accept requests only from origins that match an entry in
`allowedOrigins` exactly. Typical entries:

- `http://localhost:8081` — Expo web dev server
- `http://127.0.0.1:8081` — same, by IP
- `https://your-staging-url.example` — deployed PWA (see
  [HTTPS-to-loopback limitation](#deployed-https--loopback-limitation)
  below)

Never use `*`. The companion does not support wildcard origins.

## Ollama

The companion talks to a local Ollama instance at
`http://127.0.0.1:11434` by default. It uses **only**:

- `POST /api/generate` — text generation
- `GET  /api/tags` — list installed models

No shell execution. No file access. No URL fetching. Prompts are
JSON-schema-constrained and only ever see the slice of source text relevant
to the current stage.

Install Ollama per <https://ollama.com>. Then pull a model:

```bash
ollama pull llama3.2:3b
```

List available models:

```bash
curl http://127.0.0.1:11434/api/tags
```

## Endpoints

| Method | Path                     | Auth | Purpose                                            |
|--------|--------------------------|------|----------------------------------------------------|
| GET    | `/health`                | no   | Minimal liveness probe (version, loopback, auth).  |
| GET    | `/capabilities`          | yes  | Default model + supported languages.               |
| POST   | `/jobs/source-analysis`  | yes  | Start a 9-stage source-text analysis job.          |
| POST   | `/jobs/clcc-generation`  | yes  | Start a 5-stage CLCC realization proposal job.     |
| GET    | `/jobs/:id`              | yes  | Job status + current stage.                        |
| GET    | `/jobs/:id/events`       | yes  | **SSE** — live event stream + replay.              |
| POST   | `/jobs/:id/cancel`       | yes  | Cancel a running job.                              |
| GET    | `/jobs/:id/result`       | yes  | Final job result with proposal summary.            |

### SSE event stream

- Uses raw `fetch()` from the PWA — **not** native `EventSource` (which
  cannot send `Authorization` headers).
- The token travels exclusively in the `Authorization: Bearer <token>`
  header. It never appears in the URL, query string, event IDs, or
  persisted event payloads.
- Reconnect uses `Last-Event-ID: <ordinal>` (or `?since=N`). The companion
  replays retained events after that cursor.
- Heartbeats (`: heartbeat\n\n`) are emitted every 15s when idle.
- Event history is capped at 2000 per job (FIFO). On overflow the companion
  emits a single `history-truncated` event.

### Job state machine

```
queued → connecting → running → validating → awaiting_review
                    ↘                  ↘
                     failed             failed
                                        ↘
                                       cancelled
```

There is **no `succeeded` terminal status.** Source analysis and CLCC
generation always end in `awaiting_review` (proposals need explicit user
review) or `failed` / `cancelled`.

## Deployed HTTPS → loopback limitation

The deployed PWA is served over HTTPS. The companion is loopback HTTP. Browser
handling of secure-page-to-loopback-HTTP requests varies:

| Browser  | Behavior                                                          |
|----------|-------------------------------------------------------------------|
| Chrome   | Private Network Access preflight may block unless user approves.  |
| Firefox  | Mixed-content blocking varies by version.                         |
| Safari   | Typically blocks; no consistent user override.                    |

The PWA detects companion-connection failures with a specific error taxonomy
(`companion.mixed-content-blocked`, `companion.unauthorized`,
`companion.origin-forbidden`, `companion.unreachable`, etc.) and surfaces a
specific user-facing message.

The **tested path** for this checkpoint is the **local development origin**
(`http://localhost:8081` / `http://127.0.0.1:8081`). Deployed-PWA-to-loopback
is a named deferred compatibility item.

## Development

```bash
# From the repository root:
bun install
bun test tools/local-companion        # run the companion test suite
bunx tsc --noEmit                     # typecheck (Strategy A — root covers companion)

# Or run the companion directly:
cd tools/local-companion
bun run dev                           # start on 127.0.0.1:8765
bun run test                          # run companion tests
bun run rotate-token                  # generate a fresh token
```

## Troubleshooting

- **`EACCES` on config file:** the companion enforces mode `0600`. If you
  copied the repo with different permissions, `chmod 600
  tools/local-companion/config/companion.local.json`.
- **`EADDRINUSE` on 8765:** another process is using the port. Either stop
  it or change `port` in the config.
- **Ollama unreachable:** confirm `curl http://127.0.0.1:11434/api/tags`
  returns JSON. If not, start the Ollama service.
- **`companion.origin-forbidden` from the PWA:** add your dev origin to
  `allowedOrigins` in the config file and restart the companion.
- **`companion.unauthorized`:** token mismatch. Re-copy from the companion
  banner, or rotate.
