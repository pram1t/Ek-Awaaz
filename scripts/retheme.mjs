/* Re-skin the whole product in the heritage language: ivory ground, the dye chest,
   Marcellus and Tiro Devanagari, and the arcade mark.

   Done as a mechanical colour remap rather than a rewrite. The four pages carry about five
   hundred hardcoded hex values between them alongside their CSS variables, so redefining
   :root alone would have left every hardcoded blue in place — a half-rethemed site is worse
   than an unrethemed one. Mapping the hex values covers both at once, because the :root
   blocks are themselves just hex.

   Nothing about layout, markup structure or behaviour is touched. Same DOM, same handlers,
   same tests. Only colour, type and the mark.

   Every mapping below is deliberate:
   - the blues become madder, the teals leaf, the ambers turmeric — the dye chest, so the
     palette has a reason to exist beyond looking Indian;
   - the blue-greys become warm greys of the same lightness, or the ivory reads cold and the
     whole thing looks like a corporate site with a filter on it;
   - burgundy stays a separate alarm colour rather than collapsing into madder, because it
     marks recording and errors and must not read as the primary accent. */

import fs from 'node:fs';

/* ── the map. old → new ─────────────────────────────────────────────────────── */
const COLOUR = {
  /* structure and text: navy family → ink family */
  '#102a43': '#241a14', '#24313f': '#2e2118', '#435466': '#5c4a3c',
  '#3d4d5d': '#4e3e32', '#48596b': '#665344', '#5d6b79': '#7a6455',
  '#8a99a8': '#9a8674', '#93a2b1': '#a6907c',

  /* primary accent: blue → madder */
  '#1d4ed8': '#8c2416', '#1740b8': '#6e1b10', '#163dae': '#6e1b10',
  '#1d4ed833': '#8c241633', '#9fc7ff': '#e3b4a6', '#a6c8f0': '#e0b3a4',
  '#7191b0': '#a6836f', '#f2f7ff': '#fcf4ee', '#e7effc': '#f7e7df',
  '#dbeafe': '#f5e2d8', '#d6e1ec': '#eadfcf', '#dce8f5': '#e9dcc8',

  /* rules and fills: blue-grey → warm grey at the same lightness */
  '#cbd5df': '#e4d8c4', '#d5dfe8': '#e9decb', '#d3dee7': '#e7dcc8',
  '#dbe3ea': '#eadfcc', '#b9c8d6': '#cfbea6', '#9db4ca': '#c2ae94',
  '#a9bdd2': '#cbb9a0', '#a9bccd': '#cbb9a0', '#e6ecf2': '#ede3d3',
  '#eef3f7': '#f5ede0', '#e3eaf0': '#efe6d6', '#edf3f7': '#f5ede1',
  '#f1f5f8': '#f7f1e6', '#f4f7fa': '#f9f3e9', '#f6f8fa': '#f8f2e8',
  '#f8fafc': '#faf5ec', '#fbfcfd': '#fdf9f1', '#f8f7f3': '#fbf6ec',
  '#e8edf2': '#f1e8d9',

  /* teal → leaf */
  '#0f766e': '#1e4633', '#eef7f5': '#ebf1e9', '#e3f2ee': '#e4eee3',
  '#d8f1ed': '#dfebdc', '#24665f': '#2a5540', '#1a5c54': '#1e4633',

  /* amber → turmeric */
  '#b45309': '#8a5a1c', '#fff0d3': '#f7ead3', '#fdf1e0': '#f7ebd9',
  '#fdf3e3': '#f8eedd', '#fff6e8': '#faf2e4', '#5a4410': '#6b4a14',
  '#8a6114': '#7a5417', '#7a4a05': '#6b4a14', '#f1dfc9': '#f3e4cc',
  '#fbf3e6': '#fbf3e6',

  /* burgundy stays a distinct alarm, not a second madder */
  '#9f1239': '#a3231b', '#fdf2f5': '#fbede9', '#8a1638': '#8e2118',

  /* purple, used for the public tag */
  '#7c3aed': '#3a2e52', '#ede9fe': '#eae6f0',

  /* navy-tinted shadows and scrims → ink-tinted */
  '#102a43aa': '#241a14aa', '#102a4318': '#241a1418',
  '#102a4344': '#241a1444', '#102a4310': '#241a1410',
  '#102a4322': '#241a1422', '#102a4326': '#241a1426'
};

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Marcellus&family=Tiro+Devanagari+Hindi&family=Mukta:wght@400;500;600;700;800&display=swap';

/* the arcade: three cusped arches, the middle one filled. One voice among many. */
const LOGO = '<svg class="ea-mark" viewBox="0 0 116 44" aria-hidden="true">'
  + '<path d="M4 42 L4 20 A5.5 5.5 0 0 1 7.06 9.42 A5.2 5.2 0 0 1 15.06 2.88 A4.94 4.94 0 0 1 24.94 2.88 A5.2 5.2 0 0 1 32.94 9.42 A5.5 5.5 0 0 1 36 20 L36 42 Z" transform="translate(0 4) scale(0.85 0.84)" fill="none" stroke="currentColor" stroke-width="2.8"/>'
  + '<path d="M4 42 L4 20 A5.5 5.5 0 0 1 7.06 9.42 A5.2 5.2 0 0 1 15.06 2.88 A4.94 4.94 0 0 1 24.94 2.88 A5.2 5.2 0 0 1 32.94 9.42 A5.5 5.5 0 0 1 36 20 L36 42 Z" transform="translate(40 0)" fill="currentColor"/>'
  + '<path d="M4 42 L4 20 A5.5 5.5 0 0 1 7.06 9.42 A5.2 5.2 0 0 1 15.06 2.88 A4.94 4.94 0 0 1 24.94 2.88 A5.2 5.2 0 0 1 32.94 9.42 A5.5 5.5 0 0 1 36 20 L36 42 Z" transform="translate(82 4) scale(0.85 0.84)" fill="none" stroke="currentColor" stroke-width="2.8"/>'
  + '</svg>';

const OLD_MARK = /<span class="brand-mark"[^>]*>(?:<i><\/i>)+<\/span>/g;

const FILES = ['public/index.html', 'public/report.html', 'public/my-cases.html',
               'public/near-you.html', 'public/styles.css', 'public/voice.js', 'public/session.js'];

let totals = { colours: 0, fonts: 0, marks: 0, links: 0 };

for (const file of FILES) {
  if (!fs.existsSync(file)) { console.log('  ! missing ' + file); continue; }
  let s = fs.readFileSync(file, 'utf8');
  const before = s;

  /* 1 · colour. Case-insensitive, longest-first so #102a4318 is not eaten by #102a43. */
  const keys = Object.keys(COLOUR).sort((a, b) => b.length - a.length);
  for (const from of keys) {
    const re = new RegExp(from.replace('#', '#'), 'gi');
    const hits = (s.match(re) || []).length;
    if (hits) { s = s.replace(re, COLOUR[from]); totals.colours += hits; }
  }

  /* 2 · type. Manrope carries the UI, Mukta replaces it; Hind was the Devanagari
     display face and Tiro Devanagari Hindi is a far better one. */
  const m1 = (s.match(/Manrope/g) || []).length;
  s = s.replace(/Manrope/g, 'Mukta');
  const m2 = (s.match(/Hind,\s*serif/g) || []).length;
  s = s.replace(/Hind,\s*serif/g, '"Tiro Devanagari Hindi",serif');
  const m3 = (s.match(/'Hind'|"Hind"/g) || []).length;
  s = s.replace(/'Hind'|"Hind"/g, '"Tiro Devanagari Hindi"');
  totals.fonts += m1 + m2 + m3;

  /* 3 · the font link */
  const linkRe = /https:\/\/fonts\.googleapis\.com\/css2\?[^"']+/g;
  if (linkRe.test(s)) {
    s = s.replace(linkRe, FONT_HREF);
    totals.links += 1;
  }

  /* 4 · the mark */
  const marks = (s.match(OLD_MARK) || []).length;
  if (marks) { s = s.replace(OLD_MARK, LOGO); totals.marks += marks; }

  if (s !== before) fs.writeFileSync(file, s);
  console.log(`  ${file}`);
}

console.log(`\n${totals.colours} colours, ${totals.fonts} font references, ${totals.links} font links, ${totals.marks} marks`);

/* ── what is left ─────────────────────────────────────────────────────────── */
const WARM = /^#(f|e|d|c|b|a|9|8|7|6|2)/i;
const leftovers = new Map();
for (const file of FILES) {
  if (!fs.existsSync(file)) continue;
  for (const hex of fs.readFileSync(file, 'utf8').match(/#[0-9a-fA-F]{3,8}\b/g) || []) {
    const h = hex.toLowerCase();
    if (h === '#fff' || h === '#000' || h === '#ffffff') continue;
    if (Object.values(COLOUR).includes(h)) continue;
    leftovers.set(h, (leftovers.get(h) || 0) + 1);
  }
}
if (leftovers.size) {
  console.log('\nnot in the map — check these by eye:');
  [...leftovers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
    .forEach(([h, n]) => console.log(`  ${String(n).padStart(3)}  ${h}`));
}
