/* The references an officer needs must never be the identifiers we refuse to hold.
 *
 * The distinction the whole product rests on: a PPO number, a UAN, a PNR, a consumer number off a
 * bill, a docket, a job card — these identify a CLAIM, they are what an officer types to find the
 * file, and a citizen who quotes one gets helped faster. An account number, a card number, an
 * Aadhaar or a PAN identify a PERSON, are what a fraudster wants, and are indefensible to store
 * under DPDP.
 *
 * That line is easy to write in a comment and easy to cross in a data file at 2am. This suite runs
 * every label and hint in routing.json through the same filter that guards the model's questions, so
 * a reference list can never quietly reintroduce the thing the product promises never to ask for.
 */

import fs from 'node:fs';
import { askIsBanned } from '../server/banned-asks.js';

const doc = JSON.parse(fs.readFileSync('data/routing.json', 'utf8'));

let pass = 0, fail = 0;
const ok = (cond, name, detail) => {
  if (cond) { pass++; console.log('  ok    ' + name + (detail ? '   ' + detail : '')); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '   ' + detail : '')); }
};

console.log('\nevery domain knows what the office will need');

{
  const domains = Object.entries(doc.domains);
  const without = domains.filter(([, d]) => !Array.isArray(d.identifiers) || !d.identifiers.length);
  ok(without.length === 0, 'every domain has a reference list',
     without.length ? 'missing: ' + without.map(([k]) => k).join(', ') : domains.length + ' domains');

  const noRequired = domains.filter(([, d]) => (d.identifiers || []).every((i) => !i.required));
  ok(noRequired.length <= 1, 'almost all name at least one required reference',
     noRequired.length ? 'only optional: ' + noRequired.map(([k]) => k).join(', ') : 'all have one');

  ok(Boolean(doc.domains['money.pension']), 'pension is a domain of its own',
     'it used to fall into "other" and be asked for its village and block');
  const ppo = (doc.domains['money.pension'] || {}).identifiers || [];
  ok(ppo.some((i) => /ppo/i.test(i.key) || /PPO/.test(i.label)),
     'and it asks for the PPO number', 'the reference an officer actually needs');
}

console.log('\nand none of it is an identifier we refuse to hold');

{
  /* "It is NOT a bank account number" is reassurance, and it is exactly the sentence a citizen
     needs when we ask for a PPO number. So the check is not "does the phrase appear" but "is it
     being asked for" — a negation immediately before it flips the meaning entirely. The first
     version of this test stubbed that distinction out with a filter that always returned false,
     which is worse than not testing it: it reported a pass it had not established. */
  const NEGATED = /\b(not|never|isn'?t|no)\b[^.]{0,30}$/i;
  const asksFor = (text, re) => {
    const m = re.exec(text);
    if (!m) return false;
    return !NEGATED.test(text.slice(0, m.index));
  };

  const offenders = [];
  for (const [key, d] of Object.entries(doc.domains)) {
    for (const i of d.identifiers || []) {
      for (const [what, text] of [['label', i.label], ['hint', i.hint]]) {
        if (!text) continue;
        /* The label is the ask, so it must pass the filter outright. A hint may mention a banned
           term only to rule it out. */
        const bad = what === 'label'
          ? askIsBanned(text)
          : askIsBanned(text) && asksFor(text, /(account|card|aadhaa?r|pan)\s*(number|no\b)/i);
        if (bad) offenders.push(key + '.' + i.key + ' ' + what + ': ' + text);
      }
    }
  }
  ok(offenders.length === 0, 'no reference asks for a banned identifier',
     offenders.length ? offenders.join(' | ') : 'every label and hint checked');

  for (const [word, re] of [
    ['account number', /account\s*(number|no\b)/i],
    ['card number', /card\s*(number|no\b)/i],
    ['Aadhaar number', /aadhaa?r\s*(number|no\b)/i],
    ['PAN number', /\bpan\s*(number|no\b)/i]
  ]) {
    const asked = [];
    for (const d of Object.values(doc.domains)) {
      for (const i of d.identifiers || []) {
        for (const text of [i.label, i.hint]) if (text && asksFor(text, re)) asked.push(text);
      }
    }
    ok(asked.length === 0, 'no reference asks for a ' + word,
       asked.length ? asked.join(' | ') : 'not asked for anywhere');
  }
}

console.log('\nthe references are things a citizen can actually produce');

{
  const all = Object.values(doc.domains).flatMap((d) => d.identifiers || []);
  ok(all.every((i) => i.key && i.label), 'every reference has a key and a label', all.length + ' references');
  ok(all.every((i) => i.label.length <= 60), 'labels are short enough to read on a phone');
  ok(all.every((i) => typeof i.required === 'boolean'), 'each says whether it is required');
  const vague = all.filter((i) => /details|information|particulars/i.test(i.label));
  ok(vague.length === 0, 'no label is form-speak like "details" or "particulars"',
     vague.length ? vague.map((i) => i.label).join(', ') : 'all concrete');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
