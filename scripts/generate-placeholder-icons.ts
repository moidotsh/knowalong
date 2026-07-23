// scripts/generate-placeholder-icons.ts
//
// One-off utility: generate solid-color placeholder PNG icons for the
// PWA manifest. Arqavellum ships indigo (#4F46E5) placeholders matching the
// default `brand` color slot; consumers replace these with their actual
// brand icon (see CLAUDE.md → "How to consume").
//
// Output:
//   public/icons/192.png           — solid indigo, 192×192
//   public/icons/512.png           — solid indigo, 512×512
//   public/icons/512-maskable.png  — solid indigo, 512×512 (maskable:
//                                     the safe zone convention keeps
//                                     content inside the inner 80%, but
//                                     a solid fill makes the maskable
//                                     variant indistinguishable from
//                                     the regular one — that's fine for
//                                     a placeholder)
//
// Re-run: `bun run scripts/generate-placeholder-icons.ts`.

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BRAND_R = 0x4f;
const BRAND_G = 0x46;
const BRAND_B = 0xe5;

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

function generateSolidColorPng(size: number, r: number, g: number, b: number): Buffer {
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

  // IDAT: raw scanlines (each prefixed with filter byte 0) + zlib deflate
  const rowBytes = size * 3;
  const raw = new Uint8Array((rowBytes + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (rowBytes + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const off = y * (rowBytes + 1) + 1 + x * 3;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
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
  const buf = generateSolidColorPng(size, BRAND_R, BRAND_G, BRAND_B);
  writeFileSync(resolve(outDir, name), buf);
  console.log(`  wrote public/icons/${name} (${size}×${size}, ${buf.length} bytes)`);
}

console.log('\nDone. Consumers replace these with brand icons — see CLAUDE.md "How to consume".');
