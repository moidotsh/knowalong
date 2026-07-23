// metro.config.js
// Load-bearing: forces Metro to use traditional CJS resolution, bypassing
// the ESM `import.meta` issue that breaks web hydration.
//
// Zustand v5's `devtools` middleware (re-exported via `zustand/middleware`,
// which arqavellum pulls in through `persist`/`createJSONStorage`) references
// `import.meta.env.MODE`. When Metro resolves packages via the `exports`
// field in their package.json (the modern ESM-aware default), the ESM
// build of `zustand/middleware` is selected and the `import.meta` syntax
// flows through to the web bundle unchanged. Expo Web emits the bundle as
// a classic script (`<script src="..." defer>`, no `type="module"`), so
// the browser throws `SyntaxError: Cannot use 'import.meta' outside a
// module` at parse time. The entire bundle fails to execute and React
// never hydrates — the page looks rendered (SSR HTML is shipped) but
// nothing is interactive.
//
// Disabling `unstable_enablePackageExports` and forcing the `require` /
// `browser` condition names makes Metro pick the CJS build of every
// dependency, which uses `process.env.NODE_ENV` instead of `import.meta.env`
// and parses cleanly as a classic script.

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// NUCLEAR OPTION: Disable package.json exports entirely.
// This forces Metro to use traditional CJS resolution, bypassing
// ESM/import.meta issues.
config.resolver.unstable_enablePackageExports = false;

// Web-first resolution order.
config.resolver.unstable_conditionNames = ['browser', 'require', 'default'];

module.exports = config;
