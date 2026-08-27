/* Stamp every asset URL with a version token.
 *
 * The pages asked for voice.js?v=20260827-01, and that query string had not changed since before
 * the eleven-language picker, the Sarvam fallback and the live silence commit were written.
 * Vercel serves these with max-age=3600, so for an hour after each deploy a returning browser
 * keeps the old file under the old URL — and every one of today's voice changes was invisible.
 * That is exactly what happened: a screenshot came back showing "Use this" and an EN/हिं chip,
 * which is the file from this morning.
 *
 * A deploy that does not change the URL is a deploy the browser is entitled to ignore. So the
 * token is now derived from the content of the files themselves: change any of them and every page
 * that loads them asks for a new URL. Run this before deploying.
 *
 * Usage:  node scripts/stamp-assets.mjs
 */

import fs from 'node:fs';
import crypto from 'node:crypto';

const PAGES = ['public/index.html', 'public/report.html', 'public/my-cases.html', 'public/near-you.html'];
const ASSETS = ['voice.js', 'api-client.js', 'session.js', 'app.js', 'kolam.js', 'panels.js',
                'structure.css', 'heritage.css', 'panels.css', 'styles.css'];

/* One token for everything, from the contents of everything. A per-file hash would be tidier, but
   one token means a stale page can never pair a new script with an old stylesheet. */
const hash = crypto.createHash('sha1');
for (const a of ASSETS) {
  const p = 'public/' + a;
  if (fs.existsSync(p)) hash.update(fs.readFileSync(p));
}
const token = hash.digest('hex').slice(0, 10);

let edits = 0;
for (const page of PAGES) {
  if (!fs.existsSync(page)) continue;
  let s = fs.readFileSync(page, 'utf8');
  const before = s;

  for (const asset of ASSETS) {
    const esc = asset.replace('.', '\\.');
    /* src="voice.js" or src="voice.js?v=anything" — and the href form for stylesheets */
    s = s.replace(new RegExp('((?:src|href)=")' + esc + '(?:\\?v=[^"]*)?(")', 'g'),
                  (_m, a, b) => a + asset + '?v=' + token + b);
    /* the same asset referenced with a leading slash */
    s = s.replace(new RegExp('((?:src|href)=")/' + esc + '(?:\\?v=[^"]*)?(")', 'g'),
                  (_m, a, b) => a + '/' + asset + '?v=' + token + b);
  }

  if (s !== before) { fs.writeFileSync(page, s); edits++; console.log('  stamped ' + page); }
}

console.log('\n  token ' + token + ' — ' + edits + ' page(s) updated');

/* Report anything still loaded without a token, because one unstamped asset is one stale file. */
const bare = [];
for (const page of PAGES) {
  if (!fs.existsSync(page)) continue;
  const s = fs.readFileSync(page, 'utf8');
  for (const m of s.matchAll(/(?:src|href)="\/?([a-z0-9-]+\.(?:js|css))(\?v=([^"]*))?"/g)) {
    if (!m[2]) bare.push(page + ' → ' + m[1]);
  }
}
if (bare.length) {
  console.log('\n  loaded with no version token (a returning browser may keep the old copy):');
  for (const b of bare) console.log('    ! ' + b);
} else {
  console.log('  every asset on every page carries the token');
}
