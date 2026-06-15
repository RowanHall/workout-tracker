// Generates the Kova app-icon asset set from the brand chevron (the "Λ" mark
// from the KOVΛ wordmark). Pure Node — no native image deps — so it runs
// anywhere. Re-run with `node scripts/generate-icon.mjs` after tweaking the
// geometry/colours below.

import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'assets', 'images');

// ---- Brand ----------------------------------------------------------------
const GREEN_TOP = [0x2f, 0xd6, 0x76]; // lifted green for a "lit" top edge
const GREEN = [0x22, 0xc5, 0x5e]; // primary
const GREEN_BOTTOM = [0x16, 0xa3, 0x4a]; // primary-dim-ish
const DARK = [0x0b, 0x0f, 0x14]; // background

// Chevron geometry, in a unit square (origin top-left, y down).
const PEAK = [0.5, 0.28];
const LEFT = [0.22, 0.72];
const RIGHT = [0.78, 0.72];
const HALF_W = 0.094; // half stroke width

// ---- PNG encoding ---------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgba, hasAlpha) {
  const channels = hasAlpha ? 4 : 3;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = hasAlpha ? 6 : 2; // colour type: RGBA / RGB
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = y * (stride + 1) + 1 + x * channels;
      raw[di] = rgba[si];
      raw[di + 1] = rgba[si + 1];
      raw[di + 2] = rgba[si + 2];
      if (hasAlpha) raw[di + 3] = rgba[si + 3];
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- Geometry -------------------------------------------------------------
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function insideChevron(u, v, markScale) {
  // markScale scales the displayed mark about the centre: < 1 shrinks it into
  // the safe zone for assets that get masked (Android adaptive icons).
  const mu = 0.5 + (u - 0.5) / markScale;
  const mv = 0.5 + (v - 0.5) / markScale;
  const d = Math.min(
    distToSegment(mu, mv, LEFT[0], LEFT[1], PEAK[0], PEAK[1]),
    distToSegment(mu, mv, PEAK[0], PEAK[1], RIGHT[0], RIGHT[1])
  );
  return d <= HALF_W;
}

function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// ---- Renderer -------------------------------------------------------------
// background(u,v) -> [r,g,b,a] (a = 0 transparent, 255 opaque) or null.
function render(size, { background, chevron, markScale = 1 }) {
  const SS = 4; // supersampling for anti-aliasing
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          let px;
          if (insideChevron(u, v, markScale)) {
            px = [chevron[0], chevron[1], chevron[2], 255];
          } else {
            px = background(u, v) ?? [0, 0, 0, 0];
          }
          r += px[0] * (px[3] / 255);
          g += px[1] * (px[3] / 255);
          b += px[2] * (px[3] / 255);
          a += px[3];
        }
      }
      const n = SS * SS;
      const ai = a / n;
      const i = (y * size + x) * 4;
      // Un-premultiply so edge pixels keep the right colour.
      const cov = ai === 0 ? 0 : ai / 255;
      out[i] = cov === 0 ? 0 : Math.round(r / n / cov);
      out[i + 1] = cov === 0 ? 0 : Math.round(g / n / cov);
      out[i + 2] = cov === 0 ? 0 : Math.round(b / n / cov);
      out[i + 3] = Math.round(ai);
    }
  }
  return out;
}

function verticalGradient(top, bottom) {
  return (_u, v) => [...lerp(top, bottom, v), 255];
}
const solid = (rgb) => () => [...rgb, 255];
const transparent = () => null;

function write(name, size, rgba, hasAlpha) {
  const file = path.join(OUT, name);
  fs.writeFileSync(file, encodePNG(size, size, rgba, hasAlpha));
  console.log(`  ${name}  ${size}x${size}  ${hasAlpha ? 'RGBA' : 'RGB'}`);
}

// ---- Assets ---------------------------------------------------------------
console.log('Generating Kova icon set →', OUT);

// iOS / primary app icon: bold dark chevron on a green gradient. Opaque (no
// alpha channel — App Store rejects icons with transparency).
write(
  'icon.png',
  1024,
  render(1024, { background: verticalGradient(GREEN_TOP, GREEN_BOTTOM), chevron: DARK }),
  false
);

// Splash mark: green chevron, transparent (sits on the dark splash colour).
write(
  'splash-icon.png',
  512,
  render(512, { background: transparent, chevron: GREEN }),
  true
);

// Android adaptive foreground: green chevron, pulled into the safe zone.
write(
  'android-icon-foreground.png',
  1024,
  render(1024, { background: transparent, chevron: GREEN, markScale: 0.68 }),
  true
);

// Android adaptive background: solid brand dark.
write('android-icon-background.png', 1024, render(1024, { background: solid(DARK), chevron: DARK }), false);

// Android monochrome (themed icons): white silhouette on transparent.
write(
  'android-icon-monochrome.png',
  1024,
  render(1024, { background: transparent, chevron: [255, 255, 255], markScale: 0.68 }),
  true
);

// Web favicon.
write('favicon.png', 64, render(64, { background: solid(DARK), chevron: GREEN }), false);

console.log('Done.');
