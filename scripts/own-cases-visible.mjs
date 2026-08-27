/* A case you just filed did not show up on the public wall, and that reads as "the feature is not
 * wired". Three separate reasons, all real:
 *
 *  1. publicCases ordered by supporters DESC with a limit. A case filed a minute ago has one
 *     supporter — you — so it sorted dead last and, once the seed history grew, fell off the end
 *     of the limit entirely. (Fixed in db.js: limit raised, recency added as the tiebreak.)
 *
 *  2. `mine` was only filled in when you pressed Add my name during that visit. A case you FILED
 *     was never in it, so your own case was offered back to you as something to join, and the
 *     "Your name is on this case" line never appeared on it.
 *
 *  3. Nothing floated your own cases, so even when present, yours was somewhere down a wall of
 *     twenty-odd cases sorted by household count — the one case you were looking for was the
 *     hardest to find.
 *
 * This patch fixes 2 and 3: seed `mine` from the session's own filed and joined lists, and sort
 * your cases to the front under a marker. Strangers still see the wall ordered by household count,
 * because for them that ordering is the argument.
 */

import fs from 'node:fs';

const F = 'public/near-you.html';
let s = fs.readFileSync(F, 'utf8');

if (s.includes('function seedMine()')) { console.log('= already applied'); process.exit(0); }

/* ── 1. seed `mine` from the session ───────────────────────────────────────── */
const MINE_ANCHOR = `let all = [];
/* Cases this device has signed. Held here so a refresh cannot paint over the confirmation. */
const mine = new Set();`;

const MINE_NEW = `let all = [];
/* Cases this device has signed OR filed. Held here so a refresh cannot paint over the
   confirmation, and seeded from the session so a case you filed is recognised as yours
   the moment the wall loads — not only if you happened to join it in this visit. */
const mine = new Set();

function seedMine() {
  if (!window.EA) return;
  const s = EA.read();
  for (const c of (s.filed || [])) if (c && c.code) mine.add(c.code);
  for (const j of (s.joined || [])) if (j && j.id) mine.add(String(j.id).replace(/–/g, '-'));
}`;

if (!s.includes(MINE_ANCHOR)) { console.log('! mine anchor not found'); process.exit(1); }
s = s.replace(MINE_ANCHOR, () => MINE_NEW);

/* ── 2. your cases first, under a marker ───────────────────────────────────── */
const RENDER_ANCHOR = `  list.forEach((c) => wall.appendChild(card(c)));
  countLabel.textContent = list.length + (list.length === 1 ? ' public case' : ' public cases');`;

const RENDER_NEW = `  /* Your own cases first. For a stranger the wall stays ordered by household count, because
     that ordering is the argument; for you, the case you just filed is the one you came to see. */
  const own = list.filter((c) => mine.has(c.code));
  const rest = list.filter((c) => !mine.has(c.code));

  if (own.length) {
    const head = document.createElement('p');
    head.className = 'wall-head';
    head.textContent = own.length === 1 ? 'Your case' : 'Your cases';
    wall.appendChild(head);
    own.forEach((c) => wall.appendChild(card(c)));
    const line = document.createElement('p');
    line.className = 'wall-head';
    line.textContent = 'Open near you';
    wall.appendChild(line);
  }
  rest.forEach((c) => wall.appendChild(card(c)));
  countLabel.textContent = list.length + (list.length === 1 ? ' public case' : ' public cases');`;

if (!s.includes(RENDER_ANCHOR)) { console.log('! render anchor not found'); process.exit(1); }
s = s.replace(RENDER_ANCHOR, () => RENDER_NEW);

/* ── 3. call seedMine before the first load ────────────────────────────────── */
/* load() is called at boot; seed just before it so the very first paint knows. */
const boot = s.match(/\n(\s*)load\(\);/);
if (boot) {
  s = s.replace(boot[0], () => '\n' + boot[1] + 'seedMine();\n' + boot[1] + 'load();');
} else {
  console.log('! could not find the boot load() call — seedMine is defined but never called');
}

/* ── 4. the marker style ───────────────────────────────────────────────────── */
if (!s.includes('.wall-head{')) {
  s = s.replace('</style>', () =>
    `      .wall-head{grid-column:1/-1;margin:6px 0 0;color:#9a8674;font:800 10.5px Mukta,sans-serif;letter-spacing:.1em;text-transform:uppercase}
    </style>`);
}

fs.writeFileSync(F, s);
console.log('near-you.html — your own filed cases are recognised and shown first');
