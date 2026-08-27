/* Take the headline statistic out of the carousel and make it a standalone argument.
 *
 * Two reasons, and the second is the real one.
 *
 * Mechanically: app.js clones page one of the metric carousel to make the loop seamless, so
 * anything on that page exists twice in the DOM. Two copies of a count-up animation and two
 * proportional bars, one of them permanently off-screen and never triggered.
 *
 * Editorially: a single claim does not belong in a rotating carousel at all. The disposal-rate
 * gap is the argument the entire product rests on, and putting it on a timer that slides it
 * away after four seconds says it is one of several interchangeable facts. It is not.
 *
 * app.js reads #metricsCarousel without a null check and then calls .querySelector on it, so
 * removing the carousel would throw at that line and kill every handler declared after it —
 * which in that file includes the category cards and the ripple. The guard goes in first.
 */

import fs from 'node:fs';

let n = 0;

/* ── 1 · make the carousel optional in app.js ───────────────────────────────── */
const A = 'public/app.js';
let a = fs.readFileSync(A, 'utf8');

if (a.includes('if (metricsCarousel)')) {
  console.log('  = app.js already guarded');
} else {
  const start = a.indexOf("const metricsCarousel = document.querySelector('#metricsCarousel');");
  const end = a.indexOf('requestAnimationFrame(animateMetrics);', a.indexOf('function animateMetrics') > -1 ? a.indexOf('function animateMetrics') : start);
  const tail = a.indexOf('\n', a.lastIndexOf('requestAnimationFrame(animateMetrics);'));

  if (start < 0 || tail < 0) {
    console.log('  ! could not bound the carousel block in app.js');
  } else {
    const block = a.slice(start, tail);
    /* Wrap it whole, indented, so a missing carousel is simply nothing rather than a throw
       that takes the rest of the file with it. */
    const wrapped =
      '/* The metric carousel is optional. It was read without a null check, and one absent\n'
      + '   element there used to throw and silently kill every handler declared below it. */\n'
      + "if (document.querySelector('#metricsCarousel')) {\n"
      + block.split('\n').map((l) => (l.trim() ? '  ' + l : l)).join('\n')
      + '\n}';
    a = a.slice(0, start) + wrapped + a.slice(tail);
    fs.writeFileSync(A, a);
    n++;
    console.log('  + app.js: carousel guarded');
  }
}

/* ── 2 · replace the metrics section with the standalone argument ───────────── */
const F = 'public/index.html';
let s = fs.readFileSync(F, 'utf8');

const open = s.indexOf('<section class="metrics"');
const close = open > -1 ? s.indexOf('</section>', open) + '</section>'.length : -1;

if (open < 0 || close < 0) {
  console.log('  ! metrics section not found');
} else if (s.includes('id="gapStat"')) {
  console.log('  = index.html already standalone');
} else {
  const NEW = `<section class="section gap-section ground-rangoli" id="gapStat" aria-label="The published disposal rate, and what it does not say">
      <div class="shell">
        <div class="gap-stat" data-reveal>
          <p class="lede">The published record · March 2026</p>
          <div class="gap-bar" data-gap-bar>
            <i class="disposed" data-w="95.8"></i><i class="pending" data-w="4.2"></i>
          </div>
          <div class="gap-legend">
            <div><s class="disposed"></s><div><b data-count="181279">1,81,279</b><span>marked disposed within the month</span></div></div>
            <div><s class="pending"></s><div><b data-count="7910">7,910</b><span>still open from that month's intake</span></div></div>
            <div><div><b data-count="189189">1,89,189</b><span>lodged with central ministries</span></div></div>
          </div>
          <p class="gap-claim">A <b>95.8% disposal rate</b> — and that number is the reason this project exists. <b>Disposed means a file was closed, not that a road was repaired.</b> Nothing in the figure records whether the person who complained agrees, and nothing asks them.</p>
          <p class="gap-source">Figures as published in the CPGRAMS monthly report for March 2026. A separate 81,187 shown as pending at month end includes cases carried forward from earlier months, which is why it exceeds this month's remainder.</p>
        </div>

        <div class="gap-aside" data-reveal data-reveal-children>
          <div><b>13 days</b><span>Average time to disposal, central ministries</span></div>
          <div><b>5 lakh+</b><span>Recurring grievances identified across four years</span></div>
          <div><b>35%</b><span>Concentrated in labour, banking and petroleum</span></div>
        </div>
      </div>
    </section>`;
  s = s.slice(0, open) + NEW + s.slice(close);
  fs.writeFileSync(F, s);
  n++;
  console.log('  + index.html: statistic is a standalone section, no clone');
}

console.log('\n' + n + ' edits');
