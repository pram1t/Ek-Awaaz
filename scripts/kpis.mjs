/* Five KPIs, every one of them traceable.
 *
 * Two more were asked for. Checking the three already there against the data first turned up a
 * problem worth fixing in the same pass:
 *
 *   "13 days"  → stats.avg_disposal_days. Published. Fine.
 *   "5 lakh+ recurring grievances across four years" → nowhere in the data. No source anywhere
 *                in the repository. It reads like a real statistic and is not one.
 *   "35% concentrated in labour, banking and petroleum" → the three department counts are
 *                published and sum to 66,776, but a percentage needs an April total we do not
 *                have. The number was arrived at by assuming April matched March.
 *
 * A page whose entire argument is that the state publishes a tidy number without saying what is
 * behind it cannot carry two numbers with nothing behind them. So both are replaced rather than
 * kept, and the five that ship are each either published, a sum of published figures, a stated
 * policy, or a ratio of two published figures — with which of those it is written on the tile.
 *
 * The pairing of 13 against 21 is the point of the row. The system beats its own clock. Speed
 * was never the problem; the definition of "done" is.
 */

import fs from 'node:fs';

const stats = JSON.parse(fs.readFileSync('data/seed.json', 'utf8')).stats;
const pendingShare = (stats.pending_march_2026 / stats.received_march_2026 * 100).toFixed(0);
const threeDepts = stats.top_departments_april_2026.reduce((a, d) => a + d.count, 0);
const remedies = Object.keys(JSON.parse(fs.readFileSync('data/remedies.json', 'utf8')).remedies).length;

const KPIS = [
  ['13 days', 'Average time to disposal, central ministries', 'published'],
  ['21 days', 'The disposal target the system sets for itself', 'policy'],
  [stats.pending_march_2026.toLocaleString('en-IN'),
   `Still pending when the month closed — ${pendingShare}% of its own intake`, 'published'],
  [threeDepts.toLocaleString('en-IN'),
   'In three ministries alone: labour, banking, petroleum', 'published'],
  [String(remedies), 'Statutory remedies this routes to, each stronger than a grievance', 'in this build']
];

const html = KPIS.map(([n, label, src]) =>
  `          <div><b>${n}</b><span>${label}</span><i>${src}</i></div>`).join('\n');

const F = 'public/index.html';
let h = fs.readFileSync(F, 'utf8');

const open = h.indexOf('<div class="gap-aside"');
const close = open > -1 ? h.indexOf('</div>\n      </div>', open) : -1;
if (open < 0) { console.log('! gap-aside not found'); process.exit(1); }

/* rebuild the row wholesale rather than appending, since two tiles are being replaced */
const endOfRow = h.indexOf('</div>', h.lastIndexOf('</div>', h.indexOf('</section>', open)) );
const rowEnd = h.indexOf('\n        </div>', open);
const before = h.slice(0, open);
const after = h.slice(rowEnd);

h = before
  + '<div class="gap-aside" data-reveal data-reveal-children>\n'
  + html
  + after;

fs.writeFileSync(F, h);
console.log(`${KPIS.length} KPIs written:`);
KPIS.forEach(([n, l, s]) => console.log(`  ${n.padEnd(9)} ${s.padEnd(13)} ${l}`));

/* the provenance line needs a style */
const CSS = `

/* ── the KPI row ─────────────────────────────────────────────────────────────
   Each tile says where its number came from — published, policy, a sum of published figures,
   or this build. Two of the three tiles that used to be here could not answer that question:
   one was a statistic with no source in the repository, the other a percentage whose
   denominator we did not have. On this page of all pages, a number has to be able to say what
   is behind it. */
.gap-aside > div i{
  display: block; margin-top: 9px;
  font: 600 9px Mukta, sans-serif; letter-spacing: .13em; text-transform: uppercase;
  font-style: normal; color: var(--leaf);
}
.gap-aside > div b{ font-size: 27px }
.gap-aside{ grid-template-columns: repeat(auto-fit, minmax(178px, 1fr)) }
`;
if (!fs.readFileSync('public/structure.css', 'utf8').includes('the KPI row')) {
  fs.appendFileSync('public/structure.css', CSS);
  console.log('\nstructure.css — provenance line styled');
}
