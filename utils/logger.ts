// utils/logger.ts
// Environment-aware logging utility. This is the single legitimate `console.*`
// site in arqavellum — audit-logging-errors (S11) blocks live console calls
// elsewhere and treats this file as the source of truth.
//
// Best-effort credential redaction:
//
//   The logger applies a string-pattern redactor to the `message`
//   parameter, every string-typed arg, and `Error.message`/`Error.stack`
//   on the way to `console.*`. The redactor recognizes a small set of
//   common credential shapes (Authorization header, Bearer token,
//   `password=` / `apikey=` / `*_secret` / `*_token` key=value pairs,
//   JWT-shaped strings). It does NOT recursively scrub object
//   properties — callers logging raw `Request`, `Response`, auth-bearing
//   `Error.cause`, or session objects are expected to extract only the
//   non-sensitive fields they need. This is hygiene, not a security
//   boundary: anything callers pass through can still carry a credential
//   in a shape the redactor does not recognize. The defense-in-depth
//   value is that the common shapes get scrubbed even when a caller
//   forgets to.
//
// Caller rule (enforced by review, not by audit):
//   Don't pass raw `Request`, `Response`, `Error.cause` chains, or
//   auth/session-bearing objects to the logger. Extract the fields you
//   actually need (e.g. `logger.warn('auth', 'session refresh failed',
//   error.message)` not `logger.warn('auth', '...', error)` when the
//   error might be a fetch Response wrapper).

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext =
  | 'api'
  | 'auth'
  | 'data'
  | 'ui'
  | 'validation'
  | 'general'
  | 'mutations'
  | 'queries'
  | 'offlineQueue'
  | 'env'
  | 'debug'
  | 'error'
  | 'account'
  | 'repository'
  | 'analysis'
  | 'companion';

declare global {
  // eslint-disable-next-line no-var
  var currentLogLevel: LogLevel | undefined;
}

const isDev =
  typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const INITIAL_LOG_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) || (isDev ? 'debug' : 'warn');
if (typeof globalThis !== 'undefined' && globalThis.currentLogLevel === undefined) {
  globalThis.currentLogLevel = INITIAL_LOG_LEVEL;
}

function shouldLog(level: LogLevel): boolean {
  const effective: LogLevel =
    (typeof globalThis !== 'undefined' && globalThis.currentLogLevel) || INITIAL_LOG_LEVEL;
  return LOG_LEVELS[level] >= LOG_LEVELS[effective];
}

function formatMessage(context: LogContext, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${context.toUpperCase()}] ${message}`;
}

// ── Best-effort credential redactor ───────────────────────────────────
//
// See file header for scope and limitations. Order matters: the
// Authorization-header pattern is checked before the standalone Bearer
// pattern so the full header is replaced as a unit (otherwise the
// header colon-form would leave "Authorization: " behind while the
// Bearer segment is redacted).

const REDACTION_PATTERNS: ReadonlyArray<{ pattern: RegExp; replacement: string }> = [
  // "Authorization: Bearer xxx" / "Authorization: Basic xxx" / "Authorization: Digest xxx"
  // — case-insensitive, allows whitespace flexibility around the colon.
  {
    pattern: /(authorization\s*:\s*)(bearer|basic|digest)\s+[A-Za-z0-9._~+/=-]+={0,2}/gi,
    replacement: '$1$2 [REDACTED]',
  },
  // Standalone "Bearer xxx" token (after the Authorization pattern so
  // full headers are already collapsed).
  {
    pattern: /\b(bearer)\s+[A-Za-z0-9._~+/=-]+={0,2}/gi,
    replacement: '$1 [REDACTED]',
  },
  // Common key=value credential pairs. Matches `password=xxx`,
  // `apikey=xxx`, `client_secret=xxx`, `access_token=xxx`,
  // `refresh_token=xxx`, `secret=xxx`, `token=xxx`. Value runs until
  // the next whitespace, comma, ampersand, semicolon, quote, or
  // backtick so trailing punctuation is preserved.
  {
    pattern:
      /\b(password|passwd|apikey|api_key|client_secret|access_token|refresh_token|secret|token)\s*=\s*[^\s&,;'"`)]+/gi,
    replacement: '$1=[REDACTED]',
  },
  // JWT-shaped strings — three base64url segments separated by dots,
  // first segment starts with `eyJ` (the JSON `{"` prefix encoded).
  {
    pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    replacement: '[REDACTED_JWT]',
  },
];

export function redactString(input: string): string {
  let result = input;
  for (const { pattern, replacement } of REDACTION_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Apply best-effort redaction to a single argument.
 *
 * - Strings: regex-replaced via {@link redactString}.
 * - Errors: a shallow copy is returned with redacted `message` and
 *   `stack`; other properties (including `cause`) are dropped. Callers
 *   must not rely on `Error.cause` chains passing through unchanged.
 * - Other values (numbers, booleans, objects, undefined, null): passed
 *   through verbatim. The redactor does NOT recursively scrub object
 *   properties — see the file header for the caller rule.
 */
export function redactUnknown(input: unknown): unknown {
  if (typeof input === 'string') return redactString(input);
  if (input instanceof Error) {
    const copy = new Error(redactString(input.message));
    copy.name = input.name;
    if (input.stack) copy.stack = redactString(input.stack);
    return copy;
  }
  return input;
}

function redactArgs(args: unknown[]): unknown[] {
  return args.map(redactUnknown);
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function isTerminal(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.stdout &&
    typeof process.stdout.isTTY === 'boolean' &&
    process.stdout.isTTY
  );
}

function colorize(message: string, color: keyof typeof colors): string {
  if (!isDev || !isTerminal()) return message;
  return `${colors[color]}${message}${colors.reset}`;
}

export const logger = {
  debug: (context: LogContext, message: string, ...args: unknown[]) => {
    if (!shouldLog('debug')) return;
    const formatted = formatMessage(context, redactString(message));
    console.log(colorize(formatted, 'cyan'), ...redactArgs(args));
  },

  info: (context: LogContext, message: string, ...args: unknown[]) => {
    if (!shouldLog('info')) return;
    const formatted = formatMessage(context, redactString(message));
    console.info(colorize(formatted, 'blue'), ...redactArgs(args));
  },

  warn: (context: LogContext, message: string, ...args: unknown[]) => {
    if (!shouldLog('warn')) return;
    const formatted = formatMessage(context, redactString(message));
    console.warn(colorize(formatted, 'yellow'), ...redactArgs(args));
  },

  error: (
    context: LogContext,
    message: string,
    error?: Error | unknown,
    ...args: unknown[]
  ) => {
    if (!shouldLog('error')) return;
    const formatted = formatMessage(context, redactString(message));
    const redactedError = redactUnknown(error);
    if (redactedError instanceof Error) {
      console.error(
        colorize(formatted, 'red'),
        redactedError.message,
        redactedError.stack,
        ...redactArgs(args),
      );
    } else {
      console.error(colorize(formatted, 'red'), redactedError, ...redactArgs(args));
    }
  },

  api: {
    request: (endpoint: string, method: string, ...args: unknown[]) => {
      logger.debug('api', `${method} ${endpoint}`, ...args);
    },
    response: (endpoint: string, duration: number, ...args: unknown[]) => {
      logger.debug('api', `${endpoint} - ${duration}ms`, ...args);
    },
    error: (endpoint: string, error: Error | unknown, ...args: unknown[]) => {
      logger.error('api', `API Error: ${endpoint}`, error, ...args);
    },
  },

  auth: {
    login: (userId: string, ...args: unknown[]) => {
      logger.debug('auth', `User logged in: ${userId}`, ...args);
    },
    logout: (userId: string, ...args: unknown[]) => {
      logger.debug('auth', `User logged out: ${userId}`, ...args);
    },
    error: (action: string, error: Error | unknown, ...args: unknown[]) => {
      logger.error('auth', `Auth Error: ${action}`, error, ...args);
    },
  },

  data: {
    load: (source: string, count: number, ...args: unknown[]) => {
      logger.debug('data', `Loaded ${count} items from ${source}`, ...args);
    },
    save: (source: string, ...args: unknown[]) => {
      logger.debug('data', `Saved data to ${source}`, ...args);
    },
    error: (operation: string, error: Error | unknown, ...args: unknown[]) => {
      logger.error('data', `Data Error: ${operation}`, error, ...args);
    },
  },

  validation: {
    success: (field: string, ...args: unknown[]) => {
      logger.debug('validation', `Validation passed: ${field}`, ...args);
    },
    error: (field: string, reason: string, ...args: unknown[]) => {
      logger.warn('validation', `Validation failed: ${field} - ${reason}`, ...args);
    },
  },

  ui: {
    navigation: (from: string, to: string, ...args: unknown[]) => {
      logger.debug('ui', `Navigation: ${from} -> ${to}`, ...args);
    },
    action: (component: string, action: string, ...args: unknown[]) => {
      logger.debug('ui', `${component}: ${action}`, ...args);
    },
  },

  setLogLevel: (level: LogLevel) => {
    globalThis.currentLogLevel = level;
  },

  isDebugEnabled: () => shouldLog('debug'),

  isInfoEnabled: () => shouldLog('info'),
};

export default logger;

export type { LogLevel, LogContext };
