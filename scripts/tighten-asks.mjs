/* Two fixes that the prompt alone did not hold.

   1. She kept asking for a full account number. Rule Three forbids it, but a prompt is not a
      guardrail — so it is now enforced in guardrails.js and the ask is dropped.
   2. "Which office have you complained to?" appeared in four of six cases. My own rule invited
      it by allowing the question wherever it "changes the next step", which she read as always.
      Only two domains genuinely need it: a bank case, where the date of the first complaint
      starts the Ombudsman clock, and office.inaction, where the office IS the complaint. */

import fs from 'node:fs';

/* ---------- 1. prompt: narrow the exception instead of describing it ---------- */

const aiFile = 'server/ai.js';
let ai = fs.readFileSync(aiFile, 'utf8');

const oldRule = 'You may ask which office they have ALREADY been to, and only where that changes the next step.';
const newRule = [
  'The ONLY two cases where you may ask about an office at all:',
  '  money.bank — when they first told the bank, because that date starts the ombudsman clock',
  '  office.inaction — which office is ignoring them, because that IS the complaint',
  'Everywhere else, asking about an office is forbidden. Ask about the problem instead: how long,',
  'how bad, who is affected, what it has stopped, what it has cost.'
].join('\n');

if (!ai.includes(oldRule)) { console.error('rule two anchor not found'); process.exit(1); }
ai = ai.replace(oldRule, newRule);
fs.writeFileSync(aiFile, ai);
console.log('ai.js  — office exception narrowed to two domains');

/* ---------- 2. guardrails: drop the ask outright ---------- */

const gFile = 'server/guardrails.js';
let g = fs.readFileSync(gFile, 'utf8');

const anchor = 'function clean(value, maxLen) {';
const block = [
  '/* Questions Smiti must never put to a citizen, enforced rather than requested.',
  '   Asking for a full account or card number invites exactly the data we promised not to hold,',
  '   and asking which office is responsible is the question this whole product exists to answer',
  '   FOR them. An ask matching these is dropped; the hand-written one for the domain takes its',
  '   place. */',
  'const BANNED_ASK = [',
  '  /\\b(account|card|debit card|credit card)\\s*(number|no\\.?|num)\\b/i,',
  '  /\\b(खाता|अकाउंट)\\s*(नंबर|संख्या)/,',
  '  /\\bkhata\\s*(number|no)\\b/i,',
  '  /\\b(aadhaar|aadhar|pan)\\b.*\\b(number|no\\.?)\\b/i,',
  '  /\\bwhich (office|department|authority|ministry)\\b.*\\b(handles?|looks after|deals? with|is responsible)\\b/i,',
  '  /\\bकौन\\s*सा\\s*(ऑफिस|दफ्तर|विभाग)\\b.*\\b(देखता|संभालता|ज़िम्मेदार)/,',
  '  /\\bkaun\\s*sa\\s*(office|vibhag)\\b.*\\b(dekhta|sambhalta)\\b/i',
  '];',
  '',
  'export function askIsBanned(q) {',
  '  return BANNED_ASK.some((re) => re.test(String(q || \'\')));',
  '}',
  '',
  anchor
].join('\n');

if (!g.includes(anchor)) { console.error('clean() anchor not found'); process.exit(1); }
g = g.replace(anchor, block);

/* wire it into the ask validator, keeping the hand-written question as the replacement */
const oldMap = `      const asks = out.asks
        .map((a, i) => ({`;
const newMap = `      const asks = out.asks
        .filter((a) => !askIsBanned(a && a.q))
        .map((a, i) => ({`;
if (!g.includes(oldMap)) { console.error('asks map anchor not found'); process.exit(1); }
g = g.replace(oldMap, newMap);

/* top up from the hand-written set if filtering left us short */
const oldTail = `      if (asks.length) safe.asks = asks;`;
const newTail = [
  '      /* If a banned ask was dropped we would be left with one question, so top up from the',
  '         hand-written set for this domain rather than showing a thinner flow. */',
  '      const wanted = 2;',
  '      const spare = (fallback.asks || []).filter((f) => !asks.some((a) => a.q === f.q));',
  '      while (asks.length < wanted && spare.length) asks.push(spare.shift());',
  '      if (asks.length) safe.asks = asks.slice(0, 3);'
].join('\n');
g = g.replace(oldTail, newTail);

fs.writeFileSync(gFile, g);
console.log('guardrails.js — banned asks dropped and topped up from the hand-written set');
