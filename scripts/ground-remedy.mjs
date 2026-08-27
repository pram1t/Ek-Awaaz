/* Two fixes to "ask about this case".

   1. The remedy ladder was not in the facts handed to the model, so the single most useful
      question a citizen can ask — "what can I do if they miss the deadline?" — came back as
      "the record does not answer that". It does answer it: every case carries a remedyKey,
      and remedies.json holds the forum, the teeth, the clock and the provision. Not passing
      it meant the strongest thing this project knows was invisible at the exact moment it
      was asked for.

   2. A refusal was being styled as a successful answer. `source` is 'model' whether the
      model answered from the record or reported that the record is silent, so
      "the record does not hold that" appeared under a green "From the case record" heading.
      The server now says whether the question was actually covered, and the interface
      follows it. A refusal has to look like one. */

import fs from 'node:fs';

let n = 0;

/* ---------------- ai.js ---------------- */

const F = 'server/ai.js';
let s = fs.readFileSync(F, 'utf8');

if (!s.includes('remedies')) {
  s = s.replace(`import { routing } from './db.js';`, `import { routing, remedies } from './db.js';`);
  n++;
}

if (!s.includes("['Remedy available'")) {
  const anchor = `    ['Visibility', c.visibility]
  ].filter`;
  if (!s.includes(anchor)) { console.log('  ! caseFacts tail not found'); }
  else {
    s = s.replace(anchor, `    ['Visibility', c.visibility]
  ].concat(remedyLines(c)).filter`);
    n++;
  }

  s = s.replace(`/* Anything that reads as a hard fact and is not in the record is a fabrication. */`,
`/* The remedy is part of the record. Without it the most useful question a citizen can ask —
   what happens if the office misses the deadline — reads as unanswerable. */
function remedyLines(c) {
  const r = c.remedyKey && remedies && remedies.remedies && remedies.remedies[c.remedyKey];
  if (!r) return [];
  return [
    ['Remedy available if the office misses the deadline', r.title],
    ['Where that remedy is heard', r.forum],
    ['What that forum can order', r.teeth],
    ['Time limit on that remedy', r.clock],
    ['Provision it comes from', r.provision],
    ['Caveat on that remedy', r.caveat || null]
  ];
}

/* Anything that reads as a hard fact and is not in the record is a fabrication. */`);
  n++;
}

if (!s.includes('covered:')) {
  /* A model answer that reports an absence is still a model answer, but it is not coverage. */
  s = s.replace(`    cacheSet(key, answer);
    return { answer, source: 'model', grounded: true };`,
`    cacheSet(key, answer);
    return { answer, source: 'model', grounded: true, covered: covers(answer) };`);

  s = s.replace(`    answer: 'I can only answer from what is on this case, and this is not on it. What the case does '`,
`    covered: false,
    answer: 'I can only answer from what is on this case, and this is not on it. What the case does '`);

  s = s.replace(`function groundedEnough(answer, facts) {`,
`/* Whether the answer actually answered, or reported that the record is silent. The interface
   styles those two differently, so it has to be told which it got. */
const SILENT = /\\b(?:record|case|file)\\b[^.]{0,40}\\b(?:does not|doesn't|do not|cannot|can't|is silent|has no|holds no|says nothing)\\b|\\bnot (?:recorded|on (?:the )?(?:record|file)|mentioned|held|stated)\\b|\\bno (?:record|mention|date|information)\\b/i;
function covers(answer) { return !SILENT.test(String(answer)); }

function groundedEnough(answer, facts) {`);
  n++;
}

fs.writeFileSync(F, s);
console.log('ai.js  ' + n + ' edits');

/* ---------------- is remedies exported from db.js? ---------------- */

const DB = 'server/db.js';
let d = fs.readFileSync(DB, 'utf8');
if (!/export (?:const|let) remedies|export \{[^}]*remedies/.test(d)) {
  console.log('  ! db.js does not export `remedies` — checking how it is loaded');
  const m = d.match(/const remedies\s*=\s*[^;]+;/);
  if (m) {
    d = d.replace(m[0], m[0].replace('const remedies', 'export const remedies'));
    fs.writeFileSync(DB, d);
    console.log('  db.js — remedies exported');
  } else console.log('  ! could not find a remedies binding in db.js');
} else console.log('  = db.js already exports remedies');

/* ---------------- the interface follows the flag ---------------- */

const UI = 'public/my-cases.html';
let h = fs.readFileSync(UI, 'utf8');
const a = `        const thin = res.source !== 'model';`;
const b = `        /* A refusal has to look like one, whoever produced it. */
        const thin = res.source !== 'model' || res.covered === false;`;
if (h.includes(b)) console.log('  = ui already applied');
else if (!h.includes(a)) console.log('  ! ui thin flag not found');
else { fs.writeFileSync(UI, h.replace(a, b)); console.log('my-cases.html — refusal styling follows the server'); }
