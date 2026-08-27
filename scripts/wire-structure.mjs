/* Wire the structural layer into the pages.
 *
 * The stylesheet and the kolam are useless until the markup asks for them, so this does the
 * asking: links the files, puts a kolam behind the hero and the join panel, marks the card
 * groups for staggered entrance, lays rangoli into two section grounds, and replaces the
 * three-numbers-in-boxes statistic with the proportional bar.
 *
 * Nothing here removes content or changes a handler. Every edit is additive except the
 * statistic, which is replaced because the version it replaces argues against the product.
 */

import fs from 'node:fs';

let n = 0;
const swap = (s, a, b, marker) => {
  if (marker && s.includes(marker)) { console.log('    = already: ' + marker.slice(0, 34)); return s; }
  if (!s.includes(a)) { console.log('    ! miss: ' + a.slice(0, 52)); return s; }
  n++;
  return s.replace(a, () => b);
};

/* ── the two new files, on every page ───────────────────────────────────────── */
const LINKS = '  <link rel="stylesheet" href="/structure.css?v=20260827-s1" />\n';
const SCRIPT = '<script src="kolam.js?v=20260827-s1"></script>\n';

for (const f of ['public/index.html', 'public/report.html', 'public/my-cases.html', 'public/near-you.html']) {
  let s = fs.readFileSync(f, 'utf8');
  console.log('  ' + f);

  if (!s.includes('structure.css')) {
    const i = s.lastIndexOf('</head>');
    s = s.slice(0, i) + LINKS + s.slice(i);
    n++;
  }
  if (!s.includes('kolam.js')) {
    const i = s.lastIndexOf('</body>');
    s = s.slice(0, i) + SCRIPT + s.slice(i);
    n++;
  }
  fs.writeFileSync(f, s);
}

/* ── index: the kolam, the reveals, the rangoli grounds, the statistic ──────── */
let s = fs.readFileSync('public/index.html', 'utf8');
console.log('\n  public/index.html — structure');

/* a kolam behind the hero, and the hero becomes its host */
s = swap(s, '<div class="hero-intro">',
  '<div class="kolam-field" data-kolam data-kolam-rings="4" data-kolam-petals="8" aria-hidden="true"></div>\n'
  + '          <div class="kolam-field tl soft leaf" data-kolam data-kolam-rings="2" data-kolam-petals="6" data-kolam-gap="38" aria-hidden="true"></div>\n'
  + '          <div class="hero-intro">',
  'data-kolam-rings="4"');

s = swap(s, '<section class="hero"', '<section class="hero has-kolam"', 'hero has-kolam');

/* the concern cards and the case stack arrive rather than sit there */
s = swap(s, '<div class="concern-track"', '<div class="concern-track" data-reveal data-reveal-children',
  'concern-track" data-reveal');
s = swap(s, '<div class="feature-grid"', '<div class="feature-grid" data-reveal data-reveal-children',
  'feature-grid" data-reveal');
s = swap(s, '<div class="case-stack" id="caseStack"', '<div class="case-stack" id="caseStack" data-reveal',
  'caseStack" data-reveal');

/* rangoli into the two quiet grounds, so the page has texture between the loud parts */
s = swap(s, '<section class="section case-section">',
  '<section class="section case-section ground-rangoli">', 'case-section ground-rangoli');

/* ── the statistic ──────────────────────────────────────────────────────────
   Replaced, not restyled. Three numbers reading "96% redressed" is the claim this project
   exists to dispute, sitting on its own homepage. The same figures as one proportional bar
   make the argument instead: almost all of it was marked disposed, and disposed is not
   fixed. The numbers are labelled as what they are — the published monthly figure — and
   the arithmetic is stated rather than implied, because a pending count larger than
   lodged-minus-disposed is carry-over from earlier months and looks like an error unless
   you say so. */
const OLD_STAT = /<div class="metric-page"><div><strong[^>]*>1,89,189<\/strong>[\s\S]*?<\/div><\/div>(?=<div class="metric-page">)/;
const NEW_STAT = `<div class="metric-page"><div class="gap-stat">
  <p class="lede">The published record, March 2026</p>
  <div class="gap-bar" data-gap-bar>
    <i class="disposed" data-w="95.8"></i><i class="pending" data-w="4.2"></i>
  </div>
  <div class="gap-legend">
    <div><s class="disposed"></s><div><b data-count="181279">181279</b><span>marked disposed in the month</span></div></div>
    <div><s class="pending"></s><div><b data-count="7910">7910</b><span>still open from that month's intake</span></div></div>
    <div><div><b data-count="189189">189189</b><span>lodged with central ministries</span></div></div>
  </div>
  <p class="gap-claim">That is a <b>95.8% disposal rate</b> — and it is the number this whole project is about. <b>Disposed is a file being closed, not a road being repaired.</b> Nothing in that figure records whether the person who complained agrees.</p>
  <p class="gap-source">Figures as published in the CPGRAMS monthly report for March 2026. The separate 81,187 pending at month end includes cases carried over from earlier months, which is why it exceeds this month's remainder.</p>
</div></div>`;

if (OLD_STAT.test(s)) { s = s.replace(OLD_STAT, () => NEW_STAT); n++; console.log('    + statistic rebuilt as the gap argument'); }
else console.log('    ! statistic block not matched — left alone');

fs.writeFileSync('public/index.html', s);

/* ── near-you and my-cases: reveals on the lists ───────────────────────────── */
let ny = fs.readFileSync('public/near-you.html', 'utf8');
console.log('\n  public/near-you.html — structure');
ny = swap(ny, '<div class="wall" id="wall"></div>',
  '<div class="wall" id="wall" data-reveal data-reveal-children></div>', 'wall" data-reveal');
ny = swap(ny, '<main class="main"><div class="shell">',
  '<main class="main has-kolam"><div class="kolam-field soft leaf" data-kolam data-kolam-rings="3" data-kolam-petals="6" aria-hidden="true"></div><div class="shell">',
  'main class="main has-kolam"');
fs.writeFileSync('public/near-you.html', ny);

console.log('\n' + n + ' edits');
