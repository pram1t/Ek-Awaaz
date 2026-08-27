/* Redraw the mark so it reads as three arches at 18 pixels each.
 *
 * The first version was the mockup's arch scaled down, and it did not survive the trip. Two
 * reasons, both proportion rather than taste:
 *
 *   - It was almost as wide as it was tall. A cusped arch says "arch" because it is a doorway,
 *     and a doorway is portrait. Square, with vertical sides and a flat base, it reads as a
 *     torso — which is exactly what it looked like: three small tunics in a row.
 *
 *   - Five foils across 18 pixels is roughly three pixels each, below the point where a
 *     scallop is a scallop. Three foils at that size still reads as cusped; five reads as a
 *     wobble.
 *
 * So: 24 wide by 42 tall per bay, three foils, and the outer two set slightly lower so the
 * filled middle one carries the eye. The geometry is recomputed rather than squashed, because
 * scaling a five-foil arch narrower would just make five thinner bumps.
 */

import fs from 'node:fs';

/* Three foils on a 24x42 bay. Points sampled on the arch ellipse (cx 17, rx 12, ry 16,
   springline y 18), then each chord carries an arc that bulges outward. */
const BAY = 'M5 42 L5 18'
  + ' A6.2 6.2 0 0 1 10.4 4.6'
  + ' A5.9 5.9 0 0 1 23.6 4.6'
  + ' A6.2 6.2 0 0 1 29 18'
  + ' L29 42 Z';

const MARK = '<svg class="ea-mark" viewBox="0 0 112 44" aria-hidden="true">'
  + `<path d="${BAY}" transform="translate(0 2)" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/>`
  + `<path d="${BAY}" transform="translate(39 0)" fill="currentColor"/>`
  + `<path d="${BAY}" transform="translate(78 2)" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/>`
  + '</svg>';

const FILES = ['public/index.html', 'public/report.html', 'public/my-cases.html', 'public/near-you.html'];
let n = 0;

for (const f of FILES) {
  let s = fs.readFileSync(f, 'utf8');
  const before = s;
  /* replace whatever shape the mark currently has, wherever it appears */
  s = s.replace(/<svg class="ea-mark"[\s\S]*?<\/svg>/g, () => MARK);
  if (s !== before) {
    fs.writeFileSync(f, s);
    const count = (before.match(/<svg class="ea-mark"/g) || []).length;
    n += count;
    console.log(`  + ${f}  (${count})`);
  } else console.log(`  ! no mark found in ${f}`);
}

console.log(`\n${n} marks redrawn`);
