// components/journey/DuskArtworkVector.tsx
//
// Original artwork for the prototype collection — no photographs, no
// album covers, nothing that implies a real recording. Three quiet night
// scenes drawn in SVG (dusk skyline / north platform / metro arch), one
// per canonical media item. Color values are inline by design: the S7
// hardcode audit exempts *Vector.tsx files, which is where drawn artwork
// belongs.

import React from 'react';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Rect,
  Stop,
  SvgProps,
} from 'react-native-svg';
import type { MediaItem } from '../../utils/journey';

export type DuskArtworkKey = MediaItem['artwork'];

interface DuskArtworkVectorProps extends SvgProps {
  artwork: DuskArtworkKey;
  /** Accessible description; defaults to the scene name. */
  label?: string;
}

function DuskScene() {
  return (
    <>
      <Defs>
        <LinearGradient id="duskSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3E4A55" />
          <Stop offset="0.62" stopColor="#7A5C50" />
          <Stop offset="1" stopColor="#B98A63" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="160" height="100" fill="url(#duskSky)" />
      {/* skyline */}
      <Rect x="0" y="58" width="34" height="42" fill="#232A2F" />
      <Rect x="30" y="44" width="26" height="56" fill="#2B333A" />
      <Rect x="60" y="52" width="22" height="48" fill="#20262B" />
      <Rect x="86" y="38" width="30" height="62" fill="#282F36" />
      <Rect x="120" y="56" width="40" height="44" fill="#232A2F" />
      {/* lit windows */}
      <Rect x="36" y="52" width="4" height="5" fill="#E8B36A" />
      <Rect x="46" y="64" width="4" height="5" fill="#E8B36A" />
      <Rect x="92" y="46" width="4" height="5" fill="#F2C583" />
      <Rect x="102" y="58" width="4" height="5" fill="#E8B36A" />
      <Rect x="128" y="66" width="4" height="5" fill="#E8B36A" />
      {/* the light the speaker sees */}
      <Circle cx="132" cy="34" r="9" fill="#F2C583" opacity="0.22" />
      <Circle cx="132" cy="34" r="3.4" fill="#F6D9A4" />
    </>
  );
}

function NorthScene() {
  return (
    <>
      <Defs>
        <LinearGradient id="northSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#131C26" />
          <Stop offset="1" stopColor="#2A3644" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="160" height="100" fill="url(#northSky)" />
      {/* stars */}
      <Circle cx="22" cy="16" r="1" fill="#C9D4DD" />
      <Circle cx="64" cy="10" r="0.8" fill="#C9D4DD" />
      <Circle cx="104" cy="20" r="1" fill="#C9D4DD" />
      <Circle cx="140" cy="12" r="0.8" fill="#C9D4DD" />
      {/* lamp and its cone */}
      <Rect x="34" y="26" width="2.4" height="40" fill="#0E141B" />
      <Circle cx="35.2" cy="26" r="3" fill="#EFD9A7" />
      <Circle cx="35.2" cy="26" r="8" fill="#EFD9A7" opacity="0.14" />
      {/* platform edge + rails going north */}
      <Rect x="0" y="66" width="160" height="6" fill="#3A4653" />
      <Rect x="0" y="72" width="160" height="28" fill="#151C24" />
      <Rect x="30" y="72" width="4" height="28" fill="#4A5866" />
      <Rect x="126" y="72" width="4" height="28" fill="#4A5866" />
      {/* the train's headlight, far up the line */}
      <Circle cx="80" cy="66" r="5" fill="#F2C583" opacity="0.16" />
      <Circle cx="80" cy="66" r="1.8" fill="#F6D9A4" />
    </>
  );
}

function MetroScene() {
  return (
    <>
      <Defs>
        <LinearGradient id="metroVault" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2E2723" />
          <Stop offset="1" stopColor="#191512" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="160" height="100" fill="url(#metroVault)" />
      {/* the vaulted hall */}
      <Circle cx="80" cy="86" r="62" fill="#3B332C" />
      <Circle cx="80" cy="86" r="62" fill="none" stroke="#57493D" strokeWidth="1.4" />
      <Circle cx="80" cy="86" r="46" fill="#241F1B" />
      {/* the roundel: М on a plaque */}
      <Circle cx="80" cy="52" r="11" fill="#7A3B2A" />
      <Rect
        x="72.5"
        y="47.5"
        width="15"
        height="9"
        rx="1.2"
        fill="none"
        stroke="#E8D9C4"
        strokeWidth="1.1"
      />
      <Rect x="74.5" y="49.5" width="1.6" height="5" fill="#E8D9C4" />
      <Rect x="79.2" y="49.5" width="1.6" height="5" fill="#E8D9C4" />
      <Rect x="83.9" y="49.5" width="1.6" height="5" fill="#E8D9C4" />
      <Rect x="75.3" y="49.5" width="1.4" height="1.4" fill="#E8D9C4" />
      <Rect x="80" y="49.5" width="1.4" height="1.4" fill="#E8D9C4" />
      <Rect x="84.7" y="49.5" width="1.4" height="1.4" fill="#E8D9C4" />
      {/* escalator light-line down into the hall */}
      <Rect x="58" y="70" width="44" height="2.4" rx="1.2" fill="#C9A86B" opacity="0.7" />
      <Rect x="64" y="78" width="32" height="2" rx="1" fill="#C9A86B" opacity="0.4" />
    </>
  );
}

const SCENES: Record<DuskArtworkKey, () => React.ReactElement> = {
  dusk: DuskScene,
  north: NorthScene,
  metro: MetroScene,
};

const DEFAULT_LABELS: Record<DuskArtworkKey, string> = {
  dusk: 'Original artwork: a skyline at dusk with one lit window',
  north: 'Original artwork: a night platform, rails going north',
  metro: 'Original artwork: a vaulted metro hall with a roundel',
};

export function DuskArtworkVector({ artwork, label, ...rest }: DuskArtworkVectorProps) {
  const Scene = SCENES[artwork];
  return (
    <Svg
      viewBox="0 0 160 100"
      preserveAspectRatio="xMidYMid slice"
      accessibilityRole="image"
      accessibilityLabel={label ?? DEFAULT_LABELS[artwork]}
      {...rest}
    >
      <Scene />
    </Svg>
  );
}

export default DuskArtworkVector;
