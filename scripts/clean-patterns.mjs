/* Five corrections, all of them removing something.
 *
 *  1. THE DIVIDER HAD GAPS. The band tiled with repeat-x and showed a space between every
 *     tile, because the source SVG's content sits at x=11.72 in a viewBox that starts at -5 —
 *     seventeen units of empty margin on each side, faithfully repeated. Measured with getBBox
 *     and cropped to the drawn content, so tiles butt against each other.
 *
 *  2. THE CIRCLE GROUND IS GONE. The overlapping-circle rangoli laid into section backgrounds
 *     read as a grid of stamps rather than as texture, which is what a repeating unit does when
 *     the unit is recognisable. Removed from the stylesheet and from every section using it.
 *
 *  3. THE DARK JOIN PANEL is no longer patterned and no longer transparent: a deeper ground
 *     with a blur behind it, so the numbers on it have something solid to sit on.
 *
 *  4. THE GENERATED KOLAM IS GONE. I drew it — concentric rings of circles around a dot grid —
 *     and it was the weakest thing on the page: at low opacity behind a headline it reads as a
 *     bubble field, not as a kolam. The authored ornaments do the same job properly. The
 *     drawing animation goes with it; the reveal, counter and bar logic in that file stays,
 *     since those are unrelated and working.
 *
 *  5. Same removal everywhere else it appeared, which was the near-you main and the report
 *     thread.
 *
 * Deleting my own work here rather than defending it: three of these were things I added, and
 * an ornament that has to be argued for is not working.
 */

import fs from 'node:fs';

/* ── 1 · a band that tiles ─────────────────────────────────────────────────── */
const src = fs.readFileSync('public/img/ornament/motifs-663.svg', 'utf8');
/* measured in the browser: content occupies 11.72,11.72 76.56x76.56 in a -5,-10,110,112 box.
   Cropping to the content is what closes the gap between tiles. */
const band = src.replace(/viewBox="[^"]*"/, 'viewBox="11.72 11.72 76.56 76.56"');
fs.writeFileSync('public/img/ornament/motifs-band.svg', band);
console.log('  + motifs-band.svg — viewBox cropped to the drawn content, so it tiles flush');

/* ── 2 + 4 · strip the patterns from the stylesheet ────────────────────────── */
let css = fs.readFileSync('public/structure.css', 'utf8');
const cssBefore = css.length;

/* the circle ground */
css = css.replace(/\/\* ── 2 · rangoli as section ground[\s\S]*?\n\}\n(\.ground-rangoli\.on-dark\{[\s\S]*?\n\}\n)?/,
`/* ── 2 · section grounds ─────────────────────────────────────────────────────
   The overlapping-circle rangoli that used to live here has been removed. A repeating unit
   only reads as texture while the unit itself is not recognisable; a circle is very
   recognisable, so at any opacity that would show it read as a grid of stamps behind the
   words. The authored ornaments carry the pattern instead, used once and large. */
`);

/* the kolam field */
css = css.replace(/\/\* ── 1 · the kolam field[\s\S]*?\.has-kolam > \*:not\(\.kolam-field\)\{[^}]*\}\n/,
`/* ── 1 · ornament fields ─────────────────────────────────────────────────────
   The generated kolam that used to sit here is gone. At the opacity a background needs it
   read as a field of bubbles rather than as a drawn kolam, which is the risk with geometry
   generated rather than composed. */
`);

/* the dark join panel: solid and deeper, no pattern */
css = css.replace(/\/\* ── 6 · the join panel[\s\S]*?\.joint-case > \*, \.join-dark > \*\{[^}]*\}/,
`/* ── 6 · the join panel ─────────────────────────────────────────────────────
   Deeper ground and a blur behind it rather than a pattern. The count sitting on this panel
   is the loudest number on the page and it needs something solid under it, not a texture
   competing with it at the same contrast. */
.joint-case, .join-dark{ position: relative; isolation: isolate; background: #1a120d }
.joint-case::before, .join-dark::before{
  content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(120% 90% at 18% 30%, #2e2118 0%, #1a120d 58%, #140e0a 100%);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
}
.joint-case > *, .join-dark > *{ position: relative; z-index: 1 }`);

/* point the band at the cropped file */
css = css.split('motifs-663.svg').join('motifs-band.svg');
/* and let it tile at a size that shows the motif rather than stretching it */
css = css.replace('repeat-x center / auto 100%;\n  mask: url("/img/ornament/motifs-band.svg") repeat-x center / auto 100%;',
                  'repeat-x center / 46px 100%;\n  mask: url("/img/ornament/motifs-band.svg") repeat-x center / 46px 100%;');

/* the thread mandala stays — it is authored, used once, and large */
fs.writeFileSync('public/structure.css', css);
console.log(`  ~ structure.css  ${cssBefore} -> ${css.length} bytes`);

/* ── the markup ────────────────────────────────────────────────────────────── */
const PAGES = ['public/index.html', 'public/report.html', 'public/my-cases.html', 'public/near-you.html'];
let removed = 0;

for (const f of PAGES) {
  let h = fs.readFileSync(f, 'utf8');
  const before = h;

  /* every kolam host, with or without attributes */
  h = h.replace(/\s*<div class="kolam-field[^"]*"[^>]*><\/div>/g, () => { removed++; return ''; });
  h = h.replace(/\s*<div class="kolam-field[^"]*"[^>]*>[\s\S]*?<\/div>/g, () => { removed++; return ''; });

  /* the ground-rangoli class, wherever it is applied */
  h = h.replace(/ ground-rangoli(?= |")/g, () => { removed++; return ''; });
  h = h.replace(/class="ground-rangoli"/g, () => { removed++; return 'class=""'; });

  /* has-kolam is meaningless once the field is gone */
  h = h.replace(/ has-kolam(?= |")/g, '');

  if (h !== before) { fs.writeFileSync(f, h); console.log('  ~ ' + f); }
}
console.log(`  ${removed} pattern hosts removed from markup`);

/* ── kolam.js keeps the motion, loses the drawing ─────────────────────────── */
let js = fs.readFileSync('public/kolam.js', 'utf8');
const jsBefore = js.length;

/* cut the generator and its mounting; keep reveal, count, bar and the watchdog */
const from = js.indexOf('  /* ─────────────────────────────── 1 · KOLAM ─────────────────────────────── */');
const to = js.indexOf('  /* ─────────────────────────────── 2 · REVEAL ────────────────────────────── */');
if (from > -1 && to > from) {
  js = js.slice(0, from)
    + '  /* The kolam generator that used to live here has been removed. It produced concentric\n'
    + '     rings of circles around a pulli dot grid, and at the opacity a page background needs\n'
    + '     it read as a field of bubbles rather than as a drawn kolam. The authored ornaments do\n'
    + '     that job properly. What follows — the entrance reveals, the counters and the\n'
    + '     proportional bar — is unrelated and stays. */\n\n'
    + js.slice(to);
}
js = js.replace(/function boot\(\) \{[^}]*\}/, 'function boot() { mountReveals(); mountCounters(); mountBars(); watchdog(2600); }');
js = js.replace(/\s*document\.querySelectorAll\("\.kolam [\s\S]*?\}\);\n\s*document\.querySelectorAll\("\.kolam circle[\s\S]*?\}\);\n/, '\n');
js = js.replace('window.EAKolam = { rangoli, remount: boot };', 'window.EAMotion = { remount: boot };');
js = js.replace(/^\/\* Ek Awaaz — kolam, and the motion that goes with it\./m,
                '/* Ek Awaaz — page motion: entrance reveals, counters, proportional bars.');

fs.writeFileSync('public/kolam.js', js);
console.log(`  ~ kolam.js  ${jsBefore} -> ${js.length} bytes (generator removed, motion kept)`);
