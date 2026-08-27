/* Which words on this site would a person not use out loud?
 *
 * The earlier pass rewrote the homepage and a few pages by hand. That is not a method — it finds
 * what you happen to look at. This reads every citizen-facing string in the build, scores it, and
 * prints the worst, so the rewrite is driven by the text rather than by memory.
 *
 * What counts as citizen-facing:
 *   · visible text in the four pages
 *   · the strings in the overlay and the chat client
 *   · routing.json and remedies.json — every line of those is read by a citizen at the moment they
 *     matter most, and they are the most legalistic text in the repo
 *   · error and status messages from the server, which appear verbatim on screen
 *   · Smiti's own prompt, because it decides the register of everything she generates
 *
 * Scored on three things, in order of how much they hurt:
 *   1. jargon — a word with a plain equivalent that we chose not to use
 *   2. sentence length — over 25 words, a reader loses the subject
 *   3. long words — 12+ letters, as a rough proxy for latinate register
 *
 * Run:  node scripts/audit-plain-english.mjs [--all]
 */

import fs from 'node:fs';

const showAll = process.argv.includes('--all');

/* Words we keep on purpose, with the reason. A jargon list that flags these is a list that gets
   ignored. */
const KEEP = new Set([
  'grievance', 'grievances',        // the portal's own word; the argument quotes it
  'disposed',                       // the government's word; the whole argument turns on it
  'ombudsman', 'panchayat',         // the actual names of the actual bodies
  'municipal', 'commissioner', 'collector', 'sarpanch',
  'aadhaar', 'provident',           // proper nouns
]);

const JARGON = {
  'redressal': 'sorting it out / getting it fixed',
  'statutory': 'legal / in law',
  'adjudicator': 'someone who can decide',
  'adjudicating': 'deciding',
  'escalate': 'go up to',
  'escalated': 'went up to',
  'escalates': 'goes up to',
  'escalation': 'moving it up',
  'jurisdiction': 'whose job it is',
  'sectoral': '(drop it)',
  'provision': 'rule / law',
  'provisions': 'rules',
  'appellate': 'appeal',
  'signatory': 'person on the case',
  'signatories': 'people on the case',
  'signature': 'name',
  'signatures': 'names',
  'joinder': 'joining a case',
  'recurrence': 'happening again',
  'entitlement': 'what you are owed',
  'entitlements': 'what you are owed',
  'devolution': '(explain it)',
  'constitutional': '(usually droppable)',
  'nodal': '(drop it)',
  'ambit': 'covered by',
  'quasi-judicial': 'court-like',
  'stipulated': 'set',
  'commence': 'start',
  'utilise': 'use',
  'facilitate': 'help',
  'endeavour': 'try',
  'aforementioned': 'that',
  'thereafter': 'after that',
  'herein': 'here',
  'pursuant': 'under',
  'lapsed': 'ran out',
  'incumbent': '(drop it)',
  'expeditious': 'quick',
  'expeditiously': 'quickly',
  'furnish': 'give',
  'intimate': 'tell',
  'intimation': 'a message',
  'requisite': 'needed',
  'in lieu of': 'instead of',
  'vide': '(drop it)',
  'as per': 'under / according to',
  'inter alia': 'among other things',
  'prima facie': 'on the face of it',
  'sub-judice': 'already in court',
  'grievance redressal officer': '(keep the title, explain it once)',
};

/* ── collect the strings ───────────────────────────────────────────────────── */
const found = [];   /* { file, where, text } */

function addPageText(file) {
  if (!fs.existsSync(file)) return;
  const h = fs.readFileSync(file, 'utf8')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ');
  for (const m of h.matchAll(/>([^<>]{18,})</g)) {
    const t = m[1].replace(/\s+/g, ' ').trim();
    if (t) found.push({ file, where: 'page text', text: t });
  }
  /* placeholders and aria labels are read too */
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/(?:placeholder|aria-label|title)="([^"]{14,})"/g)) {
    found.push({ file, where: 'label', text: m[1] });
  }
}

function addJsStrings(file) {
  if (!fs.existsSync(file)) return;
  const src = fs.readFileSync(file, 'utf8');
  /* Prose written for whoever maintains this is not read by a citizen. Flagging comments drowns
     the strings that actually appear on screen, so they come out first. */
  const noComments = src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');

  /* Anything that is plainly code rather than a sentence someone reads. */
  const isCode = (t) => /CREATE TABLE|INSERT INTO|INSERT OR IGNORE|DELETE FROM|WHERE |VALUES |pendingAuthAction|SELECT |UPDATE |PRIMARY KEY|TEXT NOT NULL|position:|display:|border-radius|font:|import |=>|maxTokens|querySelector|innerHTML|addEventListener/i.test(t);

  for (const m of noComments.matchAll(/'([^'\\\n]{22,})'/g)) {
    const t = m[1];
    if (/^[<>#.\/{}[\]]|^[a-z-]+$|http|\.js$|\.css$|^\/api/.test(t)) continue;
    if (isCode(t)) continue;
    if (!/[a-zA-Z]{3}\s+[a-zA-Z]{3}/.test(t)) continue;      /* needs at least two words */
    found.push({ file, where: 'string', text: t.replace(/\s+/g, ' ').trim() });
  }
  for (const m of noComments.matchAll(/`([^`\\]{22,})`/g)) {
    const t = m[1];
    if (/\$\{|<[a-z]/.test(t)) continue;
    if (isCode(t)) continue;
    if (!/[a-zA-Z]{3}\s+[a-zA-Z]{3}/.test(t)) continue;
    found.push({ file, where: 'template', text: t.replace(/\s+/g, ' ').trim() });
  }
}

function addJson(file, fields) {
  if (!fs.existsSync(file)) return;
  const walk = (node, path) => {
    if (typeof node === 'string') {
      const key = path[path.length - 1];
      if (fields.some((f) => key === f) && node.length > 18) {
        found.push({ file, where: path.slice(-3).join('.'), text: node.replace(/\s+/g, ' ').trim() });
      }
      return;
    }
    if (Array.isArray(node)) { node.forEach((n, i) => walk(n, path.concat(String(i)))); return; }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) walk(v, path.concat(k));
    }
  };
  walk(JSON.parse(fs.readFileSync(file, 'utf8')), []);
}

for (const p of ['public/index.html', 'public/report.html', 'public/my-cases.html', 'public/near-you.html']) addPageText(p);
for (const j of ['public/session.js', 'public/app.js', 'public/api-client.js', 'public/voice.js', 'public/panels.js']) addJsStrings(j);
for (const s of ['server/api.js', 'server/db.js', 'server/guardrails.js', 'server/speech.js', 'server/ai.js']) addJsStrings(s);
addJson('data/routing.json', ['reason', 'legal_basis', 'fallback', 'question', 'hint', 'q', 'label', 'note', 'warning', 'evidence']);
addJson('data/remedies.json', ['what', 'why', 'how', 'teeth', 'note', 'label', 'forum', 'gate', 'scope', 'provision', 'summary', 'title']);

/* ── score ─────────────────────────────────────────────────────────────────── */
/* The real names of real bodies. A citizen who asks for "the officer who fixes ration problems"
   is sent away; one who asks for the District Grievance Redressal Officer is not. So these are
   kept deliberately and explained in the surrounding words — they are stripped out before the
   jargon scan, so what is measured is OUR prose, not the statute book. */
const OFFICIAL = [
  /District Grievance Redressal Officer/gi,
  /Consumer Grievance Redressal Forum/gi,
  /Grievance Redressal Officer/gi,
  /Redressal Commission/gi,
  /First Appellate Authority/gi,
  /Appellate Authority/gi,
  /Appellate Tribunal/gi,
  /Adjudicating Officer/gi,
  /Nodal Officer/gi,
];
const stripOfficial = (t) => OFFICIAL.reduce((acc, re) => acc.replace(re, ' '), t);

/* Officialese we quote on purpose, because translating it is the product. */
const QUOTED = [/empanelled agency vide work order/i];

const score = (text) => {
  if (QUOTED.some((re) => re.test(text))) return { hits: [], longest: 0, longWords: [], points: 0 };
  const lower = ' ' + stripOfficial(text).toLowerCase() + ' ';
  const hits = [];
  for (const word of Object.keys(JARGON)) {
    if (KEEP.has(word)) continue;
    const re = new RegExp('[^a-z]' + word.replace(/[-\s]/g, '[-\\s]') + '[^a-z]', 'i');
    if (re.test(lower)) hits.push(word);
  }
  const sentences = text.split(/(?<=[.?!])\s+/).filter(Boolean);
  const longest = Math.max(0, ...sentences.map((s) => s.split(/\s+/).length));
  const words = text.split(/\s+/).filter(Boolean);
  const longWords = words.filter((w) => w.replace(/[^A-Za-z]/g, '').length >= 12);
  return { hits, longest, longWords, points: hits.length * 10 + Math.max(0, longest - 25) + longWords.length * 2 };
};

const scored = found.map((f) => ({ ...f, ...score(f.text) })).filter((f) => f.points > 0);
scored.sort((a, b) => b.points - a.points);

/* ── report ────────────────────────────────────────────────────────────────── */
const byFile = new Map();
for (const s of scored) byFile.set(s.file, (byFile.get(s.file) || 0) + 1);

console.log('\n  strings inspected: ' + found.length + '   needing work: ' + scored.length + '\n');
console.log('  by file');
for (const [file, n] of [...byFile.entries()].sort((a, b) => b[1] - a[1])) {
  console.log('    ' + String(n).padStart(3) + '  ' + file);
}

const jargonCount = new Map();
for (const s of scored) for (const h of s.hits) jargonCount.set(h, (jargonCount.get(h) || 0) + 1);
if (jargonCount.size) {
  console.log('\n  jargon in use');
  for (const [w, n] of [...jargonCount.entries()].sort((a, b) => b[1] - a[1])) {
    console.log('    ' + String(n).padStart(3) + '  ' + w.padEnd(22) + '→ ' + JARGON[w]);
  }
}

console.log('\n  worst offenders');
for (const s of scored.slice(0, showAll ? scored.length : 25)) {
  console.log('\n    [' + s.points + '] ' + s.file + ' · ' + s.where
    + (s.hits.length ? '   jargon: ' + s.hits.join(', ') : '')
    + (s.longest > 25 ? '   longest sentence: ' + s.longest + 'w' : ''));
  console.log('      ' + s.text.slice(0, 200));
}
console.log('');
