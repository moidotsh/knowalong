// types/global.d.ts
// Ambient declarations for arqavellum. Bun-types + expo types cover most of the
// surface; this file fills the gaps.

declare const __DEV__: boolean;

interface Window {
  sessionStorage: Storage;
  localStorage: Storage;
}

// Module declarations for assets that don't ship their own types.
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}
