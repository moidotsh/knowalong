// scripts/tts-shims/empty.js
//
// Empty stub used to satisfy esbuild when bundling Piper for the browser.
// Piper's dist contains Emscripten's standard Node/web environment split — the
// `require("fs")` / `require("path")` calls live inside branches guarded by
// `ENVIRONMENT_IS_NODE` (typeof process.versions.node), which never runs in a
// browser. esbuild resolves `fs`/`path` to this empty module so bundling
// succeeds; the guarded code never executes at runtime. Pure ESM (default
// export) so it interops cleanly with the CJS `require()`s in Piper's dist.

export default {};
