// @ts-check
/**
 * Minimal ESLint flat config for structural integrity checks (S6 + S8).
 *
 * Exists separately from eslint.config.js so it can gate commits without
 * being blocked by lint backlogs in the main config. Enables only:
 *   - react/jsx-no-leaked-render (S6: unsafe `&&` render patterns)
 *   - no-restricted-syntax banning bare `fetch()` (S8: raw-fetch ban)
 *
 * Loads eslint-config-expo for the bundled react plugin + TypeScript parser,
 * then disables EVERY rule expo enables so only the S6 + S8 checks can fail a run.
 *
 * Run via: `eslint . --config eslint.structure.config.js --quiet`
 *
 * NOTE: ignores are duplicated from eslint.config.js. If new top-level
 * directories are added to the main config's ignores, mirror them here.
 */
const expo = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

// Build a "disable everything" rule set from whatever expo enables.
const disableAllExpoRules = {};
for (const config of expo) {
  if (config && config.rules) {
    for (const ruleName of Object.keys(config.rules)) {
      disableAllExpoRules[ruleName] = 'off';
    }
  }
}

module.exports = [
  ...expo,
  prettier,
  {
    ignores: [
      'dist/*',
      'node_modules/*',
      'supabase/**',
      'scripts/**',
      // Companion is a separate Bun-only runtime (not subject to PWA structural rules);
      // typechecked by root `tsc --noEmit` and tested by `bun test tools/local-companion`.
      'tools/**',
    ],
  },
  {
    rules: {
      ...disableAllExpoRules,
      'no-console': 'off',

      // S6: prevent `{expr && <Component/>}` from leaking 0/"" as children.
      'react/jsx-no-leaked-render': [
        'error',
        { validStrategies: ['ternary', 'coerce'] },
      ],

      // S8: no raw fetch() in client code. Use fetchWithRetry() from
      // utils/api-client.ts instead. The two wrapper files that must call
      // raw fetch (would otherwise infinite-loop through fetchWithRetry),
      // the service worker (its entire purpose is to intercept fetches),
      // and the Supabase client (15s-timeout wrapper around fetch) are
      // exempt — see override below.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.type='Identifier'][callee.name='fetch']",
          message:
            'S8: Use fetchWithRetry() from utils/api-client.ts instead of raw fetch().',
        },
      ],
    },
  },
  {
    // S8 carve-outs: low-level fetch wrappers that must call raw fetch(),
    // the service worker (its entire purpose is to intercept fetches),
    // and the Supabase client wrapper (adds a 15s timeout via AbortController
    // — fetchWithRetry would infinite-loop or double-wrap the timeout).
    files: [
      'utils/api-client.ts',
      'utils/supabase/client.ts',
      'public/sw.js',
      // SSE-over-fetch seam: native EventSource cannot send Authorization
      // headers, so authenticated streaming requires raw fetch() + manual
      // SSE-frame parsing over a ReadableStream. fetchWithRetry wraps fetch
      // with retry/timeout and would infinite-loop or kill the long-lived
      // stream — see utils/companion/companionClient.ts.
      'utils/companion/companionClient.ts',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
];
