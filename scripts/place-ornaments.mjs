/* Put the ornaments to work.
 *
 * They are used as CSS masks rather than as background images, which is the whole reason for
 * changing their fills to currentColor being not quite enough: a background-image cannot take
 * a colour from CSS, but a mask can. One file then serves faint madder behind the hero, cream
 * on a dark ground, and leaf green in a divider, with no second copy and no recolouring by
 * hand.
 *
 * Placement:
 *   - the mehndi mandala is the hero medallion, large and faint, bleeding off the right edge
 *   - the paisley wreath balances it, smaller, top left, fainter still
 *   - the folk border band divides the major sections
 *   - the plaited border sits above the footer, where a page wants a closing rule
 *
 * The generated kolam stays. It draws itself on load, which the static ornaments cannot, and
 * the two do different jobs: the kolam is motion, these are structure.
 */

import fs from 'node:fs';

const CSS = `

/* ═══════════════════════ ORNAMENT ═══════════════════════
   Authored ornaments, used as masks so CSS owns the colour. See CREDITS.md — these are CC BY
   and the attribution lives there, not inside the artwork. */

.orn{
  position: absolute; z-index: 0; pointer-events: none;
  background-color: currentColor;
  -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  -webkit-mask-position: center; mask-position: center;
  -webkit-mask-size: contain; mask-size: contain;
}

/* the hero medallion */
.orn-mandala{
  color: var(--madder); opacity: .085;
  width: min(58vw, 620px); aspect-ratio: 1;
  inset: auto -12% -26% auto;
  -webkit-mask-image: url("/img/ornament/mehndi-and-sangeet-595.svg");
  mask-image: url("/img/ornament/mehndi-and-sangeet-595.svg");
}
/* the counterweight */
.orn-wreath{
  color: var(--leaf); opacity: .07;
  width: min(34vw, 340px); aspect-ratio: 1;
  inset: -14% auto auto -10%;
  -webkit-mask-image: url("/img/ornament/circle-lace-ornament-851.svg");
  mask-image: url("/img/ornament/circle-lace-ornament-851.svg");
}
@media (max-width: 900px){
  .orn-mandala{ width: 116vw; inset: auto -40% -14% auto; opacity: .07 }
  .orn-wreath{ display: none }
}

/* ── dividers ────────────────────────────────────────────────────────────────
   A border band, tiled horizontally. Masked, so the same file gives a madder rule between
   ivory sections and a cream one against the dark footer. */
.rule-band{
  height: 46px; width: 100%;
  background-color: var(--madder); opacity: .5;
  -webkit-mask: url("/img/ornament/motifs-663.svg") repeat-x center / auto 100%;
  mask: url("/img/ornament/motifs-663.svg") repeat-x center / auto 100%;
}
.rule-band.leaf{ background-color: var(--leaf) }
.rule-band.cream{ background-color: var(--cream); opacity: .85 }
.rule-band.tight{ height: 30px; opacity: .38 }

.rule-braid{
  height: 26px; width: 100%;
  background-color: var(--madder); opacity: .45;
  -webkit-mask: url("/img/ornament/scandinavian-pattern-157.svg") repeat-x center / auto 260%;
  mask: url("/img/ornament/scandinavian-pattern-157.svg") repeat-x center / auto 260%;
}
.rule-braid.cream{ background-color: var(--cream); opacity: .7 }

/* a sprig, for a heading that wants marking */
.orn-sprig{
  display: inline-block; width: 26px; height: 26px; vertical-align: -5px;
  background-color: var(--madder); opacity: .55;
  -webkit-mask: url("/img/ornament/scandinavian-pattern-162.svg") no-repeat center / contain;
  mask: url("/img/ornament/scandinavian-pattern-162.svg") no-repeat center / contain;
}
`;

fs.appendFileSync('public/structure.css', CSS);
console.log('structure.css — ornament rules appended');

/* ── markup ───────────────────────────────────────────────────────────────── */
let h = fs.readFileSync('public/index.html', 'utf8');
let n = 0;
const swap = (a, b, marker) => {
  if (marker && h.includes(marker)) { console.log('  = already: ' + marker.slice(0, 30)); return; }
  if (!h.includes(a)) { console.log('  ! miss: ' + a.slice(0, 50)); return; }
  h = h.replace(a, () => b); n++;
};

/* the hero gains the two ornaments alongside the kolam it already has */
swap('<div class="kolam-field" data-kolam',
     '<div class="orn orn-mandala" aria-hidden="true"></div>\n'
   + '          <div class="orn orn-wreath" aria-hidden="true"></div>\n'
   + '          <div class="kolam-field" data-kolam',
     'orn orn-mandala');

/* a band before the case section and before the footer */
swap('<section class="section case-section ground-rangoli">',
     '<div class="rule-band tight" aria-hidden="true"></div>\n'
   + '    <section class="section case-section ground-rangoli">',
     'rule-band tight');

swap('<footer id="footer">',
     '<div class="rule-braid" aria-hidden="true"></div>\n    <footer id="footer">',
     'rule-braid');

fs.writeFileSync('public/index.html', h);
console.log('index.html — ' + n + ' placements');
