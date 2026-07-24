// tools/local-companion/adapters/ollama.ts
// Minimal HTTP adapter for Ollama. Uses /api/generate + /api/tags ONLY —
// no shell exec, no arbitrary model file paths. The model is validated
// against /api/tags at job start so a typo doesn't silently route to
// a non-existent backend.

import { z } from 'zod';

export interface OllamaAdapterOptions {
  baseUrl: string;
  defaultModel: string;
}

const TagsResponseSchema = z.object({
  models: z.array(
    z.object({
      name: z.string(),
      modified_at: z.string().optional(),
      size: z.number().optional(),
    }),
  ),
});

const GenerateResponseSchema = z.object({
  model: z.string(),
  response: z.string(),
  done: z.boolean(),
});

/** Per-chunk schema for `stream: true` responses. Ollama emits one JSON
 *  object per line; every line has `response` (possibly empty) and the
 *  final line has `done: true`. */
const GenerateChunkSchema = z.object({
  model: z.string().optional(),
  response: z.string().optional(),
  done: z.boolean().optional(),
});

export interface GenerateOptions {
  model: string;
  prompt: string;
  /** JSON-schema constraint (format). */
  format?: Record<string, unknown>;
  /** Lower temperature for structured output. */
  temperature?: number;
  maxRetries?: number;
  /**
   * Phase 4 token streaming. When provided, the adapter switches to
   * `stream: true` and invokes the callback for each incremental chunk
   * off the wire. The accumulated text is still returned as `result.text`
   * so existing callers work unchanged. Callbacks MUST be cheap — they
   * fire on the fetch loop, not on the caller's promise chain.
   */
  onToken?: (chunk: string) => void;
}

export interface GenerateResult {
  text: string;
  model: string;
}

export function createOllamaAdapter(opts: OllamaAdapterOptions) {
  const baseUrl = opts.baseUrl.replace(/\/$/, '');

  async function listModels(): Promise<string[]> {
    const res = await fetch(`${baseUrl}/api/tags`, { method: 'GET' });
    if (!res.ok) {
      // s10-exempt: caught by the pipeline caller and emitted as a warning event.
      throw new Error(`Ollama /api/tags returned ${res.status}`);
    }
    const parsed = TagsResponseSchema.parse(await res.json());
    return parsed.models.map((m) => m.name);
  }

  async function validateModel(model: string): Promise<void> {
    const models = await listModels();
    // Ollama model names can include tags (`llama3.2:3b`); match either
    // the exact name or the untagged prefix.
    const exact = models.includes(model);
    const byPrefix = models.some((m) => m === model || m.startsWith(`${model}:`));
    if (!exact && !byPrefix) {
      // s10-exempt: surfaced to the job caller and emitted as a warning event.
      throw new Error(
        `Model ${model} not found in Ollama. Available models: ${models.slice(0, 5).join(', ')}${models.length > 5 ? ` (+${models.length - 5} more)` : ''}`,
      );
    }
  }

  async function generate(opts: GenerateOptions): Promise<GenerateResult> {
    const maxRetries = opts.maxRetries ?? 2;
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Phase 4: switch to stream:true when caller passes onToken. The
        // stream is parsed line-by-line (Ollama emits NDJSON — one JSON
        // object per chunk). The accumulated text is returned exactly as
        // the non-streaming path would return it, so callers don't care.
        const useStream = typeof opts.onToken === 'function';
        const res = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: opts.model,
            prompt: opts.prompt,
            format: opts.format,
            stream: useStream,
            options: opts.temperature !== undefined ? { temperature: opts.temperature } : undefined,
          }),
        });
        if (!res.ok) {
          // s10-exempt: caught by the generate retry loop and surfaced as a pipeline warning.
          throw new Error(`Ollama /api/generate returned ${res.status}: ${await safeText(res)}`);
        }
        if (!useStream || !res.body) {
          const parsed = GenerateResponseSchema.parse(await res.json());
          return { text: parsed.response, model: parsed.model };
        }
        // Streaming path: read NDJSON chunks, accumulate, invoke callback.
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let text = '';
        let model = opts.model;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let nl = buffer.indexOf('\n');
            while (nl !== -1) {
              const line = buffer.slice(0, nl).trim();
              buffer = buffer.slice(nl + 1);
              if (line.length > 0) {
                const chunk = GenerateChunkSchema.parse(JSON.parse(line));
                if (chunk.response) {
                  text += chunk.response;
                  opts.onToken!(chunk.response);
                }
                if (chunk.model) model = chunk.model;
              }
              nl = buffer.indexOf('\n');
            }
          }
          // Drain any trailing buffered line.
          const tail = buffer.trim();
          if (tail.length > 0) {
            const chunk = GenerateChunkSchema.parse(JSON.parse(tail));
            if (chunk.response) {
              text += chunk.response;
              opts.onToken!(chunk.response);
            }
            if (chunk.model) model = chunk.model;
          }
        } finally {
          reader.releaseLock();
        }
        return { text, model };
      } catch (e) {
        lastError = e;
        // Brief backoff before retry.
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  return { listModels, validateModel, generate, defaultModel: opts.defaultModel };
}

async function safeText(res: Response): Promise<string> {
  try {
    const t = await res.text();
    return t.length > 200 ? t.slice(0, 200) + '…' : t;
  } catch {
    return '<no body>';
  }
}

export type OllamaAdapter = ReturnType<typeof createOllamaAdapter>;
