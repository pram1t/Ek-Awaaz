/* The long tail, done properly.

   After the explicit map there were still about thirty-five one-off cool colours — gradient
   stops, focus rings, a scrollbar, half a dozen light blue chip backgrounds. Hand-mapping
   each one is how you get an inconsistent palette and miss three.

   So this converts every remaining colour to HSL, and where the hue is cool it rotates it
   onto the warm palette while KEEPING THE LIGHTNESS. Lightness is what carries the visual
   hierarchy — a light chip background must stay light, a dark heading must stay dark — so
   rotating hue and damping saturation re-skins the colour without disturbing which things
   read as foreground and which as background.

   Cyans and teals go to the leaf green already in the palette. Blues and indigos go to
   madder. Saturation is damped, because a dye palette is muted and a fully saturated
   rotation looks like a filter rather than a decision.

   The palette colours introduced deliberately are whitelisted, or the greens would be
   rotated away by their own rule. */

import fs from 'node:fs';

/* deliberate palette values, never touched */
const KEEP = new Set([
  '#8c2416', '#6e1b10', '#7a1c14', '#a3231b', '#5c1409', '#8e2118',
  '#1e4633', '#2a5540', '#1a3f2d', '#24593f', '#163325', '#163d25',
  '#8a5a1c', '#7a5417', '#6b4a14', '#3a2e52',
  '#241a14', '#2e2118', '#1a120d', '#fbf6ec', '#f2e5d0', '#e4d8c4',
  '#7a6455', '#9a8674', '#a6907c', '#5c4a3c', '#665344', '#4e3e32', '#8a7361'
]);

function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  let r, g, b;
  if (s === 0) r = g = b = l;
  else {
    const hue = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    r = hue(p, q, h + 1 / 3); g = hue(p, q, h); b = hue(p, q, h - 1 / 3);
  }
  const to = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}

function warm(hex) {
  const base = hex.slice(0, 7).toLowerCase();
  const alpha = hex.length > 7 ? hex.slice(7) : '';
  if (KEEP.has(base)) return null;

  const [r, g, b] = hexToRgb(base);
  const [h, s, l] = rgbToHsl(r, g, b);

  /* only cool hues are rotated; warm ones are already where they belong */
  if (!(h >= 165 && h <= 290)) return null;
  if (s < 0.04) return null;                       /* a true grey stays a grey */

  /* cyans and teals join the leaf green; blues and indigos join madder */
  const target = h < 200 ? 150 : 18;
  /* damp saturation, and damp it harder on pale tints so they read as paper, not as candy */
  const damp = l > 0.8 ? 0.34 : l > 0.6 ? 0.42 : 0.55;

  return hslToHex(target, Math.min(s * damp, 0.55), l) + alpha;
}

const FILES = ['public/index.html', 'public/report.html', 'public/my-cases.html',
               'public/near-you.html', 'public/styles.css', 'public/voice.js', 'public/session.js'];

const changed = new Map();
let n = 0;

for (const file of FILES) {
  if (!fs.existsSync(file)) continue;
  let s = fs.readFileSync(file, 'utf8');
  const before = s;

  s = s.replace(/#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b/g, (hex) => {
    const out = warm(hex);
    if (!out) return hex;
    changed.set(hex.toLowerCase() + ' -> ' + out, (changed.get(hex.toLowerCase() + ' -> ' + out) || 0) + 1);
    n += 1;
    return out;
  });

  if (s !== before) fs.writeFileSync(file, s);
}

console.log(n + ' colours rotated onto the warm palette\n');
[...changed.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)
  .forEach(([k, c]) => console.log(`  ${String(c).padStart(3)}  ${k}`));
