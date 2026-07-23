// Mock for react-native-svg for vitest. Wired via resolve.alias in
// vitest.config.ts — every `import ... from 'react-native-svg'` resolves
// here. The mock renders each SVG primitive as a lowercase custom host
// element so React Testing Library can mount it under jsdom without
// pulling in the real native renderer. Props (including `strokeDasharray`,
// `strokeDashoffset`, `transform`, etc.) are forwarded as DOM attributes,
// so tests can assert on them via getAttribute / querySelector.

import React, { forwardRef } from 'react';

type AnyProps = Record<string, any>;

function host(tagName: string) {
  const Component = forwardRef<unknown, AnyProps>((props, ref) => {
    const { children, ...rest } = props ?? {};
    const finalProps: AnyProps = { ...rest };
    if (ref !== null && ref !== undefined) {
      finalProps.ref = ref;
    }
    return React.createElement(tagName, finalProps, children);
  });
  return Component;
}

export const Svg = host('svg');
export const Circle = host('circle');
export const Rect = host('rect');
export const Line = host('line');
export const Path = host('path');
export const G = host('g');
export const Defs = host('defs');
export const Mask = host('mask');
export const ClipPath = host('clippath');
export const LinearGradient = host('lineargradient');
export const RadialGradient = host('radialgradient');
export const Stop = host('stop');
export const Polygon = host('polygon');
export const Polyline = host('polyline');
export const Ellipse = host('ellipse');
export const Use = host('use');
export const Text = host('text');
export const TSpan = host('tspan');
export const TextPath = host('textpath');

export default {
  Svg,
  Circle,
  Rect,
  Line,
  Path,
  G,
  Defs,
  Mask,
  ClipPath,
  LinearGradient,
  RadialGradient,
  Stop,
  Polygon,
  Polyline,
  Ellipse,
  Use,
  Text,
  TSpan,
  TextPath,
};
