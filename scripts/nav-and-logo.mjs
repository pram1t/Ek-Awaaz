/* Five corrections.
 *
 *  1. "Near you" was plain text with an inline style, sitting next to a filled button — so the
 *     one genuinely novel feature in the product read as a footnote. It is a bordered button now,
 *     in every header, and it is the only place a stranger with no case number can reach joinder.
 *
 *  2. "New grievance" went to the homepage. A button called new grievance has to open the thing
 *     that takes a grievance, not the marketing page above it. It goes to /report.
 *
 *  3. There was no way home from a case page except the wordmark, which is a convention people
 *     know but not one to rely on. A Home link, first in the nav, everywhere.
 *
 *  4. The hero mandala was noisy: 620px of dense concentric detail at 8.5% behind a headline,
 *     with a second ornament in the opposite corner. It is one ornament now, 1250px, bleeding far
 *     enough off the corner that only an arc of the outer rings is in frame — the same motif read
 *     as a curve rather than as a busy disc. The wreath is gone; two ornaments in one view was
 *     the noise.
 *
 *  5. The mark is the new logo, used as a mask rather than an <img>. The file is a clean alpha
 *     silhouette — ink at A=254, every white area at A=0 — so masking it with currentColor keeps
 *     the behaviour the drawn mic had: madder on ivory, cream on the dark strip, one file. An
 *     <img> would have needed a second copy in a second colour.
 */

import fs from 'node:fs';

const PAGES = ['public/index.html', 'public/report.html', 'public/my-cases.html', 'public/near-you.html'];
let n = 0;

/* ── 5 · the mark becomes the logo ────────────────────────────────────────── */
const MARK = '<span class="ea-mark" aria-hidden="true"></span>';
for (const f of PAGES) {
  let h = fs.readFileSync(f, 'utf8');
  const before = h;
  h = h.replace(/<svg class="ea-mark"[\s\S]*?<\/svg>/g, () => MARK);
  if (h !== before) { fs.writeFileSync(f, h); n++; console.log('  ~ mark: ' + f); }
}

/* ── 1 + 2 + 3 · the nav ──────────────────────────────────────────────────── */
const NAV = (active) => {
  const item = (href, label, cls) =>
    `<a class="${cls}${active === href ? ' on' : ''}" href="${href}">${label}</a>`;
  return item('/', 'Home', 'nav-link')
       + item('/near-you', 'Near you', 'nav-btn')
       + item('/my-cases', 'My grievances', 'nav-link')
       + '<a class="button" href="/report">New grievance</a>';
};

/* my-cases */
let mc = fs.readFileSync('public/my-cases.html', 'utf8');
const mcOld = mc.match(/<div class="header-right">[\s\S]*?<\/div>(?=<\/div><\/header>)/);
if (mcOld && !mc.includes('nav-btn')) {
  mc = mc.replace(mcOld[0], () =>
    '<div class="header-right"><span class="who-line">Signed in as a prototype user</span>'
    + NAV('/my-cases') + '</div>');
  fs.writeFileSync('public/my-cases.html', mc);
  n++; console.log('  ~ nav: my-cases');
} else console.log('  = nav: my-cases already done or not matched');

/* near-you */
let ny = fs.readFileSync('public/near-you.html', 'utf8');
if (!ny.includes('nav-btn')) {
  const old = ny.match(/<div class="header-right">[\s\S]*?<\/div>/);
  if (old) {
    ny = ny.replace(old[0], () => '<div class="header-right">' + NAV('/near-you') + '</div>');
    fs.writeFileSync('public/near-you.html', ny);
    n++; console.log('  ~ nav: near-you');
  } else console.log('  ! near-you header not matched');
}

/* index: the utility nav already lists these, but Near you should stand out there too */
let idx = fs.readFileSync('public/index.html', 'utf8');
if (idx.includes('<a href="/near-you">Near you</a>') ) {
  idx = idx.replace('<a href="/near-you">Near you</a>', '<a href="/near-you" class="nav-strong">Near you</a>');
  fs.writeFileSync('public/index.html', idx);
  n++; console.log('  ~ nav: index utility bar');
}

console.log(`\n${n} edits`);

/* ── styles ───────────────────────────────────────────────────────────────── */
const CSS = `

/* ── the mark ─────────────────────────────────────────────────────────────────
   Masked rather than placed as an <img>, because the file is a clean alpha silhouette and a
   mask inherits currentColor — madder on ivory, cream on the dark strip, from one file. An
   <img> would need a second copy in a second colour. */
.ea-mark{
  display: block;
  width: 30px; height: 31px; flex: 0 0 30px;
  background-color: currentColor;
  -webkit-mask: url("/img/logo-mono.png") no-repeat center / contain;
  mask: url("/img/logo-mono.png") no-repeat center / contain;
}
.brand{ gap: 12px !important }

/* ── the nav ──────────────────────────────────────────────────────────────────
   "Near you" is the only route into joinder for someone without a case number, and it was set
   as plain text beside a filled button, which read as a footnote. It gets a border. */
.nav-link{
  color: var(--ink); text-decoration: none;
  font: 600 13px Mukta, sans-serif; letter-spacing: .01em;
}
.nav-link:hover{ color: var(--madder) }
.nav-link.on{ color: var(--madder) }

.nav-btn{
  display: inline-block; text-decoration: none;
  border: 1px solid var(--madder); color: var(--madder);
  padding: 10px 15px; border-radius: 2px;
  font: 600 13px Mukta, sans-serif;
}
.nav-btn:hover{ background: var(--madder); color: var(--cream) }
.nav-btn.on{ background: var(--madder); color: var(--cream) }

.nav-strong{ font-weight: 700 !important; color: var(--cream) !important }

.header-right{ display: flex; align-items: center; gap: 16px; flex-wrap: wrap }
.who-line{ font-size: 12px; color: var(--ink-soft) }
@media (max-width: 860px){ .who-line{ display: none } }

/* ── 4 · one ornament, large, mostly out of frame ────────────────────────────
   620px of dense concentric detail at 8.5% behind a headline is noise, and there were two of
   them in opposite corners. One now, at 1250px, pushed far enough off the corner that only an
   arc of the outer rings is in view — the same motif reading as a curve instead of a busy disc. */
.orn-mandala{
  width: min(112vw, 1250px);
  inset: auto -40% -54% auto;
  opacity: .055;
}
.orn-wreath{ display: none }
@media (max-width: 900px){
  .orn-mandala{ width: 150vw; inset: auto -58% -34% auto; opacity: .045 }
}
`;

const S = 'public/structure.css';
if (!fs.readFileSync(S, 'utf8').includes('one ornament, large, mostly out of frame')) {
  fs.appendFileSync(S, CSS);
  console.log('structure.css — mark, nav and the quieter ornament');
}
