/* Two changes.
 *
 * THE BRAID, SEAMLESS. Measured: the plait occupies 396,25147.5 59204x9706.5 inside a
 * 60000x60000 canvas — a horizontal band with an enormous empty field above and below it and a
 * thin margin at each end. Tiled uncropped it would show mostly nothing; cropped to the band it
 * repeats as a continuous plait. Same fault and same fix as the other border.
 *
 * THE MARK IS A MICROPHONE. The arcade is gone. Three arches carried an idea I liked — one
 * voice among many — but a mark has to say what the thing is before it says what it means, and
 * at masthead size those arches said "three small shapes". A microphone says voice immediately,
 * at any size, in any culture, and voice is the whole premise: एक आवाज़ means one voice, and the
 * product's first promise is that you can speak instead of filling a form.
 *
 * Drawn as a broadcast mic rather than a phone-recorder glyph: a capsule head, a cradle arc
 * under it, a stem and a base. Solid where it should read at 20 pixels, stroked only for the
 * cradle. Nothing below 2px at final size, which is the mistake the cusped arches made.
 */

import fs from 'node:fs';

/* ── 1 · the braid ────────────────────────────────────────────────────────── */
const src = fs.readFileSync('public/img/ornament/scandinavian-pattern-157.svg', 'utf8');
const braid = src.replace(/viewBox="[^"]*"/, 'viewBox="396 25147 59204 9707"');
fs.writeFileSync('public/img/ornament/braid-band.svg', braid);
console.log('  + braid-band.svg — cropped to the plait, aspect 6.1:1');

/* ── 2 · the microphone ───────────────────────────────────────────────────── */
const MIC = '<svg class="ea-mark" viewBox="0 0 28 37" aria-hidden="true">'
  /* the capsule */
  + '<rect x="9.5" y="2" width="9" height="18" rx="4.5" fill="currentColor"/>'
  /* the cradle, sweeping under it */
  + '<path d="M4 13 A10 10 0 0 0 24 13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'
  /* stem and base */
  + '<rect x="13.2" y="23" width="1.6" height="9" fill="currentColor"/>'
  + '<rect x="7" y="32" width="14" height="2.4" rx="1.2" fill="currentColor"/>'
  + '</svg>';

const PAGES = ['public/index.html', 'public/report.html', 'public/my-cases.html', 'public/near-you.html'];
let marks = 0;
for (const f of PAGES) {
  let h = fs.readFileSync(f, 'utf8');
  const c = (h.match(/<svg class="ea-mark"/g) || []).length;
  if (!c) { console.log('  ! no mark in ' + f); continue; }
  h = h.replace(/<svg class="ea-mark"[\s\S]*?<\/svg>/g, () => MIC);
  fs.writeFileSync(f, h);
  marks += c;
  console.log(`  ~ ${f} (${c})`);
}
console.log(`  ${marks} marks replaced with the microphone`);

/* ── 3 · the mark is portrait now, so the lockup changes ──────────────────── */
let css = fs.readFileSync('public/heritage.css', 'utf8');
css = css.replace(/\.ea-mark\{[^}]*\}/,
  '.ea-mark{ width: 21px; height: 28px; flex: 0 0 21px; overflow: visible }');
css = css.replace(/\.ea-mark path\{[^}]*\}\n?/, '');
css = css.replace(/\.ea-mark path\[stroke\]\{[^}]*\}\n?/, '');
if (!css.includes('a microphone, not an arcade')) {
  css += `

/* ── the mark ─────────────────────────────────────────────────────────────────
   a microphone, not an arcade. The arches carried a better idea and a worse mark: at masthead
   size they read as three small shapes rather than as architecture, and a mark has to say what
   the thing is before it says what it means. A mic says voice at any size, which is the
   product's first promise and the meaning of its name. */
.ea-mark{ width: 21px; height: 28px; flex: 0 0 21px }
.brand{ gap: 13px !important }
`;
}
fs.writeFileSync('public/heritage.css', css);
console.log('  ~ heritage.css — mark sized portrait');

/* ── 4 · the braid as the dashboard band ─────────────────────────────────── */
let s = fs.readFileSync('public/structure.css', 'utf8');
s = s.replace(/\.rule-braid\{[\s\S]*?\n\}/,
`.rule-braid{
  height: 30px; width: 100%;
  background-color: var(--madder); opacity: .5;
  /* the aspect is 6.1:1, so the tile width follows the height and the plait keeps its
     proportions instead of being stretched into a ribbon */
  -webkit-mask: url("/img/ornament/braid-band.svg") repeat-x center / 183px 100%;
  mask: url("/img/ornament/braid-band.svg") repeat-x center / 183px 100%;
}`);
s = s.replace('.rule-braid.cream{ background-color: var(--cream); opacity: .7 }',
`.rule-braid.cream{ background-color: var(--cream); opacity: .7 }
.rule-braid.leaf{ background-color: var(--leaf); opacity: .42 }
.rule-braid.tight{ height: 20px; opacity: .38 }`);
fs.writeFileSync('public/structure.css', s);
console.log('  ~ structure.css — braid band points at the cropped file');

/* ── 5 · put it in the dashboard ─────────────────────────────────────────── */
let mc = fs.readFileSync('public/my-cases.html', 'utf8');
let n = 0;
if (!mc.includes('rule-braid')) {
  /* under the page bar, where the dashboard proper begins */
  mc = mc.replace('<section class="case-area active" id="yourCases">',
    '<div class="rule-braid leaf" aria-hidden="true"></div>\n    <section class="case-area active" id="yourCases">');
  n++;
  /* and closing the page */
  mc = mc.replace('</main>', '<div class="rule-braid tight" aria-hidden="true"></div>\n</main>');
  n++;
  fs.writeFileSync('public/my-cases.html', mc);
}
console.log(`  ~ my-cases.html — ${n} braid bands placed`);
