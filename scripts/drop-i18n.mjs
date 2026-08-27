/* Remove the language selector and settle the interface on English.

   The engine worked; the coverage never got there. Nine tagged strings on a homepage of
   two hundred meant switching to Hindi produced a page that was still overwhelmingly
   English — worse than not offering the switch at all, because it advertises a promise the
   page immediately breaks. With two days left the honest move is to ship one language well
   rather than two badly.

   This does NOT touch what the product actually claims. Smiti still reads and answers in
   whatever language the citizen writes or speaks, because that comes from the model and
   from Sarvam, not from this table. The interface chrome is English; the conversation is
   not. The voice panel keeps its EN/हिं chip, which selects the speech-recognition language
   and genuinely works.

   Everything goes: the mounts, the script tags, the attributes, the file. Dead markup left
   behind reads as an abandoned feature. */

import fs from 'node:fs';

const FILES = ['public/index.html', 'public/report.html', 'public/my-cases.html'];
let totals = { mounts: 0, scripts: 0, attrs: 0 };

for (const f of FILES) {
  let h = fs.readFileSync(f, 'utf8');
  const before = h.length;

  /* the three different shapes the mount took */
  const mounts = [
    '<button class="lang-button" type="button" aria-label="Switch language">हिंदी</button>',
    '<span data-lang-mount style="order:9;margin-left:auto"></span>',
    '<span data-lang-mount></span>'
  ];
  for (const m of mounts) if (h.includes(m)) { h = h.split(m).join(''); totals.mounts++; }
  if (/data-lang-mount|lang-button/.test(h)) console.log(`  ! ${f} still has a mount`);

  /* the script tag */
  const s = h.match(/\s*<script src="i18n\.js[^"]*"><\/script>/);
  if (s) { h = h.replace(s[0], ''); totals.scripts++; }

  /* the attributes, now inert */
  const attrs = h.match(/ data-i18n(?:-ph|-aria)?="[^"]*"/g) || [];
  totals.attrs += attrs.length;
  h = h.replace(/ data-i18n(?:-ph|-aria)?="[^"]*"/g, '');

  fs.writeFileSync(f, h);
  console.log(`${f.padEnd(24)} ${before} -> ${h.length}`);
}

/* report.html asked the engine which language to start the mic in */
let r = fs.readFileSync('public/report.html', 'utf8');
r = r.replace("  lang: (window.EAI18N && EAI18N.lang === 'hi') ? 'hi-IN' : 'en-IN',",
              "  lang: 'en-IN',   /* the chip in the panel switches this to हिं */");
/* and listened for a language event that can no longer fire */
r = r.replace(/document\.addEventListener\('ea:lang',[\s\S]*?\}\);\n/, '');
fs.writeFileSync('public/report.html', r);

fs.rmSync('public/i18n.js', { force: true });

console.log(`\nremoved ${totals.mounts} mounts, ${totals.scripts} script tags, ${totals.attrs} data-i18n attributes, and public/i18n.js`);
