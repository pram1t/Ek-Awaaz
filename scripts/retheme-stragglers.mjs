/* The last blue-greys.

   The main remap cleared the palette — no #1d4ed8 and no #102a43 survive anywhere. What is
   left is twenty-odd one-off tints: gradient stops, a focus ring, two hover states, the
   burgundy family used by the mic. Each appears once, which is exactly why they were missed
   and exactly why they matter: one cold blue in an ivory page reads as a mistake. */

import fs from 'node:fs';

const MAP = {
  '#e8f0f6': '#f5ede0', '#aec3d5': '#cfbea6', '#d8e8f8': '#f0e2d4',
  '#9ab6ce44': '#c2ae9444', '#dce9f2': '#ebe0cf', '#f6f9fb': '#faf5ec',
  '#46586a': '#5c4a3c', '#a9bfd4': '#cbb9a0', '#d9e2ea': '#e9decb',
  '#e7eef5': '#f5ede1', '#eef6f5': '#ebf1e9', '#93b5f4': '#dfb0a2',
  '#718096': '#8a7361', '#7c92a8': '#9a8674', '#6b7c8e': '#7a6455',
  '#173552': '#1a120d',
  /* the burgundy family stays a distinct alarm rather than a second madder */
  '#6e1f2a': '#7a1c14', '#8f2635': '#a3231b', '#4d1720': '#5c1409',
  /* the teals that escaped */
  '#087060': '#1a3f2d', '#12947d': '#24593f', '#065747': '#163325',
  '#06172b66': '#241a1466'
};

const FILES = ['public/index.html', 'public/report.html', 'public/my-cases.html',
               'public/near-you.html', 'public/styles.css', 'public/voice.js', 'public/session.js'];

let n = 0;
for (const file of FILES) {
  if (!fs.existsSync(file)) continue;
  let s = fs.readFileSync(file, 'utf8');
  const before = s;
  for (const [from, to] of Object.entries(MAP).sort((a, b) => b[0].length - a[0].length)) {
    const re = new RegExp(from, 'gi');
    const hits = (s.match(re) || []).length;
    if (hits) { s = s.replace(re, to); n += hits; }
  }
  if (s !== before) fs.writeFileSync(file, s);
}
console.log(n + ' stragglers remapped');

/* prove it: nothing cold should be left */
const COLD = /#(?:[0-9a-f]{0,2})(?:[3-9a-f][0-9a-f])(?:[a-f][0-9a-f])\b/i;   /* rough blue-ish test */
const left = new Map();
for (const file of FILES) {
  if (!fs.existsSync(file)) continue;
  for (const hex of fs.readFileSync(file, 'utf8').match(/#[0-9a-fA-F]{6,8}\b/g) || []) {
    const h = hex.toLowerCase();
    const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
    /* a warm palette means red >= blue almost everywhere. Flag anything genuinely cool. */
    if (b > r + 8) left.set(h, (left.get(h) || 0) + 1);
  }
}
console.log(left.size ? '\nstill cool (blue above red) — inspect:' : '\nnothing cool left: every colour in the product is warm');
[...left.entries()].sort((a, b) => b[1] - a[1]).forEach(([h, c]) => console.log(`  ${String(c).padStart(3)}  ${h}`));
