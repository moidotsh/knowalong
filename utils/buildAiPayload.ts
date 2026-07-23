// utils/buildAiPayload.ts
// Pure formatter for the "Copy for AI" dev helper. Builds a plain-text,
// deterministic, skimmable payload describing the current screen so it can
// be pasted straight into an AI chat (ChatGPT, Claude, Perplexity) instead
// of taking a screenshot.
//
// Pure on purpose:
//   • No React, no clipboard, no logger — the caller owns I/O.
//   • No object introspection — only the fields the caller passes in.
//   • OmitEmpty: a missing optional field produces no empty line, so the
//     payload shape stays stable across screens that supply different
//     amounts of metadata.
//
// The formatter NEVER adds anything the caller did not pass in. The
// security contract is "no secrets unless the caller explicitly puts one
// in `visibleContent`." Screen wiring is responsible for not passing
// tokens, env vars, or hidden debug state.

/** Single value accepted in the `params` map. */
export type AiPayloadParamValue = string | number | boolean | undefined;

export interface AiPayloadInput {
  /** App name (e.g. "arqavellum" or the consumer's app name). */
  appName: string;
  /** Current route/pathname. Use expo-router's `usePathname()` at the call site. */
  route: string;
  /** Optional human-readable screen title. */
  title?: string;
  /**
   * Optional one-line "where am I / how did I get here" label, e.g.
   * "Opened from dashboard quick action". Free-form, caller-supplied.
   */
  contextLabel?: string;
  /** Optional route params + query params. Undefined values are dropped. */
  params?: Record<string, AiPayloadParamValue>;
  /**
   * Optional pre-formatted visible-content summary. Caller-owned and
   * already in plain text — recommend `"- key: value"` lines for skim
   * parity with the rest of the payload. The formatter trims and
   * appends after a blank-line separator.
   */
  visibleContent?: string;
  /** Optional override for the timestamp (defaults to `new Date()`). */
  timestamp?: Date;
}

const VISIBLE_CONTENT_HEADER = 'Visible content:';

/**
 * Build a plain-text AI-paste payload from the given inputs. Deterministic:
 * same inputs produce byte-identical output (modulo the default timestamp,
 * which is `new Date()` at call time). Sections with no value are omitted
 * entirely rather than rendered as empty labels.
 */
export function buildAiPayload(input: AiPayloadInput): string {
  if (!input || typeof input.appName !== 'string' || typeof input.route !== 'string') {
    // s10-exempt: pure input-contract guard in a leaf utility — AppError
    // would force a utils/ -> errors.ts dependency for a noop throw that
    // signals programmer error (not a runtime failure surface).
    throw new Error('buildAiPayload: appName and route are required strings');
  }

  const timestamp = input.timestamp ?? new Date();
  const lines: string[] = [];

  lines.push(`App: ${input.appName}`);
  lines.push(`Route: ${input.route}`);
  if (isNonEmpty(input.title)) {
    lines.push(`Title: ${input.title!.trim()}`);
  }
  if (isNonEmpty(input.contextLabel)) {
    lines.push(`Context: ${input.contextLabel!.trim()}`);
  }
  const paramsLine = formatParams(input.params);
  if (paramsLine) {
    lines.push(`Params: ${paramsLine}`);
  }
  lines.push(`Timestamp: ${timestamp.toISOString()}`);

  const visibleBlock = formatVisibleContent(input.visibleContent);
  if (visibleBlock) {
    lines.push('');
    lines.push(VISIBLE_CONTENT_HEADER);
    lines.push(visibleBlock);
  }

  return lines.join('\n');
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function formatParams(params: AiPayloadInput['params']): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && `${v}`.length > 0,
  );
  if (entries.length === 0) return '';
  return entries.map(([k, v]) => `${k}=${v as string | number | boolean}`).join(', ');
}

function formatVisibleContent(visibleContent: string | undefined): string {
  if (!isNonEmpty(visibleContent)) return '';
  return visibleContent!.trim();
}
