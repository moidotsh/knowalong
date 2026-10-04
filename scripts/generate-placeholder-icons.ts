// scripts/generate-placeholder-icons.ts
//
// One-off utility: generate Night Metro placeholder PNG icons for the
// PWA manifest. Night Metro is dark-first, so the placeholder is the
// night ground (#0C1016) with the boot plate's amber filament rule
// (#FFB020) drawn across it — the same 72×2 band at 50% / 42% that
// index.html's boot plate paints, scaled to the icon size. Consumers
// replace these with their actual brand icon (see CLAUDE.md →
// "How to consume").
//
// Output:
//   public/icons/192.png           — night ground + filament, 192×192
//   public/icons/512.png           — night ground + filament, 512×512
//   public/icons/512-maskable.png  — night ground + filament, 512×512
//                                     (maskable: the safe zone
//                                     convention keeps content inside
//                                     the inner 80% — the filament
//                                     sits well inside it)
//   assets/icon.png                — night ground + filament, 1024×1024
//                                     (Expo native icon — future native
//                                     extension scaffolding)
//   assets/adaptive-icon.png       — night ground + filament, 1024×1024
//                                     (Android adaptive-icon foreground)
//   assets/splash-icon.png         — night ground + filament, 1024×1024
//                                     (splash image; the splash
//                                     backgroundColor in app.config.ts
//                                     is the same night ground)
//
// Re-run: `bun run scripts/generate-placeholder-icons.ts`.

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const NIGHT_R = 0x0c;
const NIGHT_G = 0x10;
const NIGHT_B = 0x16;
const FILAMENT_R = 0xff;
const FILAMENT_G = 0xb0;
const FILAMENT_B = 0x20;

function crc32(bytes: Uint8Array): number {
  let c: number;
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBytes, Buffer.from(data), crc]);
}

function generateNightPlatePng(size: number): Buffer {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR: width, height, bit depth 8, color type 2 (truecolor RGB)
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, size);
  dv.setUint32(4, size);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Boot-plate geometry scaled to the icon: the 72×2 filament band at
  // 50% / 42% (index.html's `72px 2px at 50% 42%` rule).
  const bandW = Math.round((size * 72) / 192);
  const bandH = Math.max(2, Math.round((size * 2) / 192));
  const bandX0 = Math.round((size - bandW) / 2);
  const bandX1 = bandX0 + bandW;
  const bandY0 = Math.round((size * 42) / 100);
  const bandY1 = bandY0 + bandH;

  // IDAT: raw scanlines (each prefixed with filter byte 0) + zlib deflate
  const rowBytes = size * 3;
  const raw = new Uint8Array((rowBytes + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (rowBytes + 1)] = 0; // filter: none
    const inBand = y >= bandY0 && y < bandY1;
    for (let x = 0; x < size; x++) {
      const off = y * (rowBytes + 1) + 1 + x * 3;
      if (inBand && x >= bandX0 && x < bandX1) {
        raw[off] = FILAMENT_R;
        raw[off + 1] = FILAMENT_G;
        raw[off + 2] = FILAMENT_B;
      } else {
        raw[off] = NIGHT_R;
        raw[off + 1] = NIGHT_G;
        raw[off + 2] = NIGHT_B;
      }
    }
  }
  const compressed = deflateSync(Buffer.from(raw), { level: 9 });

  // IEND: empty
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

const outDir = resolve(process.cwd(), 'public/icons');
mkdirSync(outDir, { recursive: true });

const sizes = [
  { name: '192.png', size: 192 },
  { name: '512.png', size: 512 },
  { name: '512-maskable.png', size: 512 },
];

for (const { name, size } of sizes) {
  const buf = generateNightPlatePng(size);
  writeFileSync(resolve(outDir, name), buf);
  console.log(`  wrote public/icons/${name} (${size}×${size}, ${buf.length} bytes)`);
}

// Native scaffolding placeholders (Expo build assets — future native
// extension; see app.config.ts).
const assetsDir = resolve(process.cwd(), 'assets');
mkdirSync(assetsDir, { recursive: true });

const nativeAssets = [
  { name: 'icon.png', size: 1024 },
  { name: 'adaptive-icon.png', size: 1024 },
  { name: 'splash-icon.png', size: 1024 },
];

for (const { name, size } of nativeAssets) {
  const buf = generateNightPlatePng(size);
  writeFileSync(resolve(assetsDir, name), buf);
  console.log(`  wrote assets/${name} (${size}×${size}, ${buf.length} bytes)`);
}

console.log('\nDone. Consumers replace these with brand icons — see CLAUDE.md "How to consume".');
