/* Clean the Noun Project ornaments for use as site pattern.
 *
 * Four things happen to each file.
 *
 *  1. The baked-in credit is removed. It lives in <text> nodes, so this is a clean excision
 *     rather than a crop of the artwork — but see CREDITS.md: these are free downloads, which
 *     under the Noun Project's terms means CC BY. Taking the credit out of the graphic is
 *     normal; dropping the attribution altogether is not, so it moves to a credits file and a
 *     footer line instead of disappearing.
 *
 *  2. The viewBox is cropped to the artwork. Every one of these ships as a tall canvas with the
 *     credit band underneath — 60000x75000 with the drawing in the top 60000, or -5,-10,110,135
 *     with the drawing ending near y=100. Left uncropped, each ornament would sit with a fifth
 *     of its box as dead space, which throws off every alignment it is used in.
 *
 *  3. Black becomes currentColor, so one file serves madder on ivory and cream on a dark
 *     ground without a second copy.
 *
 *  4. Coordinate precision is reduced. These carry up to seven decimal places, which is what
 *     makes a single-path ornament weigh 78KB. Rounding to one decimal on a 60000-unit canvas
 *     is a rounding error of 1/600000 of the width — invisible, and it is most of the file.
 */

import fs from 'node:fs';
import path from 'node:path';

const SRC = 'design/svg';
const OUT = 'public/img/ornament';

/* the artwork region, per the two canvas conventions these files use */
const CROP = {
  '0 0 60000 75000': '0 0 60000 60000',
  '-5.0 -10.0 110.0 135.0': '-5 -10 110 112'
};

fs.mkdirSync(OUT, { recursive: true });

const report = [];

for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith('.svg'))) {
  const before = fs.statSync(path.join(SRC, file)).size;
  let s = fs.readFileSync(path.join(SRC, file), 'utf8');

  /* 1 · the credit */
  const credits = [...s.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].trim());
  s = s.replace(/<text[^>]*>[\s\S]*?<\/text>/g, '');

  /* 2 · the crop */
  const vb = (s.match(/viewBox="([^"]+)"/) || [])[1];
  if (vb && CROP[vb]) s = s.replace(`viewBox="${vb}"`, `viewBox="${CROP[vb]}"`);
  else if (vb) report.push(`  ! ${file}: unfamiliar viewBox "${vb}", left uncropped`);

  /* 3 · colour */
  s = s.replace(/fill:\s*black/gi, 'fill:currentColor')
       .replace(/fill="#000000"/gi, 'fill="currentColor"')
       .replace(/fill="#000"/gi, 'fill="currentColor"')
       .replace(/fill="black"/gi, 'fill="currentColor"');

  /* 4 · precision, scaled to the canvas.
     One decimal place is generous on a 60000-unit canvas and destroys a 100-unit one. The
     mehndi file is drawn in a 0..100 space using relative curves whose deltas are as small as
     0.02; rounded to one decimal every one of them became 0 and the whole ornament rendered
     blank. So the number of decimals kept is derived from the viewBox width — enough digits
     that the smallest meaningful step survives, and no more. */
  const vbNow = (s.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 100 100';
  const width = parseFloat(vbNow.split(/[\s,]+/)[2]) || 100;
  const decimals = Math.max(0, Math.min(4, Math.round(Math.log10(4000 / width))));

  /* Tokenise properly rather than running a regex over the numbers in place.
     SVG allows a compact form where a number may follow another with no separator if the next
     one begins with a dot or a minus — "0.0239716-0.0199699" is two numbers, and so is
     "0.5.5". A naive replace rounded each of those to "0" and left them touching, producing
     "00": one number where there were two, which breaks the parameter count of the curve and
     every command after it. The mehndi ornament rendered completely blank because of it.

     So: split into commands and numbers, round, and rejoin with explicit separators. Output is
     valid by construction rather than by luck. */
  const TOKEN = /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/g;
  s = s.replace(/\sd="([^"]+)"/g, (m, d) => {
    const out = [];
    let t;
    while ((t = TOKEN.exec(d)) !== null) {
      if (t[1]) out.push(t[1]);
      else out.push(String(parseFloat(parseFloat(t[2]).toFixed(decimals))));
    }
    /* a space after a command letter, commas between numbers: unambiguous either way */
    let dd = '';
    for (let i = 0; i < out.length; i++) {
      const isCmd = /^[A-Za-z]$/.test(out[i]);
      if (i === 0) dd += out[i];
      else if (isCmd || /^[A-Za-z]$/.test(out[i - 1])) dd += out[i];
      else dd += ',' + out[i];
    }
    return ' d="' + dd + '"';
  });

  /* The fill lived only on the credit <text> nodes in at least one of these files, so removing
     the credit left the artwork with no fill declared at all. Declare it on the root, where it
     is inherited and can be driven by CSS. */
  if (!/\sfill="/.test(s.slice(0, s.indexOf('>')))) {
    s = s.replace('<svg ', '<svg fill="currentColor" ');
  }

  report.push(`      (${width}-unit canvas, ${decimals} decimal${decimals === 1 ? '' : 's'})`);

  /* strip the comment blocks and collapse whitespace that survived */
  s = s.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').trim();

  /* Keep a discriminator. Three of these files are all "scandinavian-pattern-<id>", so
     stripping the id made them collide and silently overwrite each other — two patterns lost
     to a tidier filename. The last three digits are ugly but they are the only thing telling
     the three apart. */
  const base = file.replace(/^noun-/, '').replace(/\.svg$/, '');
  const m = /^(.*)-(\d+)$/.exec(base);
  const name = (m ? m[1] + '-' + m[2].slice(-3) : base) + '.svg';
  fs.writeFileSync(path.join(OUT, name), s);

  const after = Buffer.byteLength(s);
  report.push(`  ${name.padEnd(26)} ${String(Math.round(before / 1024)).padStart(3)}KB -> `
    + `${String(Math.round(after / 1024)).padStart(3)}KB   ${credits.join(' ')}`);
}

console.log('cleaned into ' + OUT + ':\n');
report.forEach((r) => console.log(r));

/* ── the attribution, kept where the licence needs it ─────────────────────── */
const CREDITS = `# Credits

## Ornament and pattern

The decorative ornaments in \`public/img/ornament/\` are from **The Noun Project**, downloaded
under the free licence, which is **CC BY 3.0** and requires attribution. The credit was removed
from inside each graphic — an attribution baked into the artwork cannot be positioned, coloured
or scaled with the design — and is recorded here instead, which is how CC BY attribution is
normally given.

| File | Creator | Source |
|:--|:--|:--|
| \`circle-lace-ornament.svg\` | Olena Panasovska | The Noun Project |
| \`mehndi-and-sangeet.svg\` | Mr Geo Neo | The Noun Project |
| \`scandinavian-pattern.svg\` | Olena Panasovska | The Noun Project |
| \`scandinavian-pattern-2.svg\` | Olena Panasovska | The Noun Project |
| \`scandinavian-pattern-3.svg\` | Olena Panasovska | The Noun Project |

Modifications made: the embedded attribution text was removed, the canvas was cropped to the
artwork, fills were changed to \`currentColor\`, and coordinate precision was reduced. CC BY 3.0
permits modification with attribution.

## Everything else

The kolam and rangoli geometry (\`public/kolam.js\`), the twelve subject illustrations
(\`public/panels.js\`), the arcade mark and the cusped-arch geometry are original work for this
project.

## Type

Marcellus, Tiro Devanagari Hindi and Mukta, all served from Google Fonts under the SIL Open
Font License.

## Data

The CPGRAMS figures shown are published government statistics, sourced in \`data/seed.json\`.
Every case, date, officer action, signature count and name in the demo is invented and flagged
as seeded in the database.
`;

fs.writeFileSync('CREDITS.md', CREDITS);
console.log('\nCREDITS.md written — CC BY attribution preserved outside the artwork');
