// Generates the Kova app-icon asset set: the KOVΛ wordmark on the brand
// dark surface, rendered with the same SF Pro Display Black Italic typeface
// the in-app `KovaLogo` falls back to on iOS. Re-run with
// `node scripts/generate-icon.mjs` after tweaking colours/spacing below.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCanvas, GlobalFonts } from '@napi-rs/canvas';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'assets', 'images');

// ---- Brand ----------------------------------------------------------------
const GREEN = '#22C55E';
const DARK = '#0B0F14';
const WORDMARK = 'KOVΛ';

// SF Pro Display Black Italic is the system font the in-app wordmark resolves
// to on iOS (fontWeight 900 + fontStyle italic). On macOS dev machines it
// lives in /Library/Fonts; bail with a clear error if it's missing.
const FONT_FAMILY = 'Kova Wordmark';
const FONT_PATH = '/Library/Fonts/SF-Pro-Display-BlackItalic.otf';
if (!fs.existsSync(FONT_PATH)) {
  console.error(`Font not found at ${FONT_PATH}.`);
  console.error('Install SF Pro from https://developer.apple.com/fonts/ or change FONT_PATH.');
  process.exit(1);
}
GlobalFonts.registerFromPath(FONT_PATH, FONT_FAMILY);

// ---- Wordmark drawing -----------------------------------------------------
/** Draw the KOVΛ wordmark centred in a `size`×`size` canvas, scaled to fit
 *  the target box (widthFrac × heightFrac of the canvas). Returns the canvas. */
function drawWordmark({ size, bg, color, widthFrac = 0.84, heightFrac = 0.42 }) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
  } else {
    ctx.clearRect(0, 0, size, size);
  }

  // Match the in-app KovaLogo's tight tracking: letterSpacing = -0.04em.
  // Canvas has no letterSpacing — draw glyph by glyph with adjusted advances.
  const letters = [...WORDMARK];
  const targetW = size * widthFrac;
  const targetH = size * heightFrac;

  // Probe at an arbitrary "trial" font size, measure, then scale to fit both
  // the width and height targets — whichever constraint is tighter wins.
  const trial = 200;
  ctx.font = `${trial}px "${FONT_FAMILY}"`;
  const trialTracking = -0.04 * trial;
  const trialWidths = letters.map((c) => ctx.measureText(c).width);
  let trialAdvance = 0;
  for (let i = 0; i < letters.length; i++) {
    trialAdvance += trialWidths[i];
    if (i < letters.length - 1) trialAdvance += trialTracking;
  }
  const trialK = ctx.measureText('K');
  const trialCapH = trialK.actualBoundingBoxAscent + trialK.actualBoundingBoxDescent;

  const fontSize = Math.min(trial * (targetW / trialAdvance), trial * (targetH / trialCapH));

  ctx.font = `${fontSize}px "${FONT_FAMILY}"`;
  const tracking = -0.04 * fontSize;
  const widths = letters.map((c) => ctx.measureText(c).width);
  let totalAdvance = 0;
  for (let i = 0; i < letters.length; i++) {
    totalAdvance += widths[i];
    if (i < letters.length - 1) totalAdvance += tracking;
  }

  const km = ctx.measureText('K');
  const capH = km.actualBoundingBoxAscent + km.actualBoundingBoxDescent;
  const baseline = (size + capH) / 2 - km.actualBoundingBoxDescent;

  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  let x = (size - totalAdvance) / 2;
  for (let i = 0; i < letters.length; i++) {
    ctx.fillText(letters[i], x, baseline);
    x += widths[i] + tracking;
  }
  return canvas;
}

function write(name, canvas) {
  const file = path.join(OUT, name);
  fs.writeFileSync(file, canvas.toBuffer('image/png'));
  console.log(`  ${name}  ${canvas.width}x${canvas.height}`);
}

// ---- Assets ---------------------------------------------------------------
console.log('Generating Kova icon set →', OUT);

// iOS app icon: green wordmark on brand dark. App Store rejects transparency
// in the primary icon, so we always paint the background.
write('icon.png', drawWordmark({ size: 1024, bg: DARK, color: GREEN }));

// Splash mark: green wordmark on transparent (sits on the dark splash colour).
write('splash-icon.png', drawWordmark({ size: 512, bg: null, color: GREEN }));

// Android adaptive foreground: shrunk into the safe zone so the launcher's
// circular/squircle mask doesn't clip the wordmark.
write(
  'android-icon-foreground.png',
  drawWordmark({ size: 1024, bg: null, color: GREEN, widthFrac: 0.6, heightFrac: 0.3 })
);

// Android adaptive background: solid brand dark.
{
  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = DARK;
  ctx.fillRect(0, 0, 1024, 1024);
  write('android-icon-background.png', canvas);
}

// Android monochrome (themed icons): white silhouette on transparent.
write(
  'android-icon-monochrome.png',
  drawWordmark({ size: 1024, bg: null, color: '#FFFFFF', widthFrac: 0.6, heightFrac: 0.3 })
);

// Web favicon.
write('favicon.png', drawWordmark({ size: 64, bg: DARK, color: GREEN }));

console.log('Done.');
