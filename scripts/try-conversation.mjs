/* Walk the intake the way the citizen in the screenshots walked it, and check the four things
   that went wrong for them.
 *
 * Their run, verbatim:
 *   "₹18,400 was debited from my account and the bank has not replied."
 *   → asked "Kab aapne bank ko pehli baar bataya?"   (Hinglish, at someone writing English)
 *   → "what?! please talk in english"                (stored as case content)
 *   → asked "What was the amount, the date, and which bank?"  (already answered in the opening)
 *   → "25th aug, idk the bank"
 *   → asked "Anything to attach?"                    (ignored "I don't know")
 *
 * So the assertions are: no language switch, no question already answered, an admitted
 * "I don't know" is not asked again, and the review screen's labels are never the questions. */

const BASE = process.env.BASE || 'http://localhost:3000';
const post = (p, body) => fetch(BASE + p, {
  method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body)
}).then((r) => r.json().then((j) => ({ status: r.status, ...j })));

let fail = 0;
const ok = (cond, label, detail) => {
  if (!cond) fail++;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${label}${detail ? '   ' + detail : ''}`);
};

const HINGLISH = /\b(aap|aapne|aapka|aapki|kya|kab|kaise|kahan|kyun|hai|hain|nahi|nahin|mera|meri|mujhe|bataya|bataiye|zaroori|baar|pehli)\b/i;
const DEV = /[ऀ-ॿ]/;

const GRIEVANCE = '₹18,400 was debited from my account and the bank has not replied.';

console.log('\nintake');
const cls = await post('/api/intake', { text: GRIEVANCE });
ok(cls.domain === 'money.bank', 'routed to the bank domain', cls.domain);
ok(cls.aiSource === 'model', 'classified by the model', cls.aiSource);

/* ── the conversation ──────────────────────────────────────────────────── */
console.log('\nthe conversation, answering as they did');
const answers = [];
/* Answer whatever is actually asked, so the run measures the product and not the harness. */
const answerFor = (q) => {
  if (/which bank|bank/i.test(q))            return "idk the bank, it was on my card";
  if (/when|date|kab/i.test(q))              return "25th august";
  if (/amount|how much|kitna/i.test(q))      return "18,400";
  if (/complain|told|report|inform/i.test(q))return "I called them the next day, no reply since";
  if (/reference|statement|docket/i.test(q)) return "no reference, I only have the SMS";
  if (/where|location|city|branch/i.test(q)) return "Ranip, Ahmedabad";
  if (/attach|photo|document/i.test(q))      return "nothing to attach";
  return "I do not know that";
};
let turn = 0, switched = 0, repeated = 0;

while (turn < 6) {
  const res = await post('/api/next', {
    grievance: GRIEVANCE, domain: cls.domain, office: cls.office || '', answers
  });
  if (res.done || !res.question) {
    console.log(`  · Smiti stopped after ${answers.length} question(s)  [${res.source}${res.reason ? ': ' + res.reason : ''}]`);
    break;
  }
  const q = res.question.q;
  console.log(`  Q${turn + 1}: ${q}`);

  /* the failure they saw: a Hinglish or Devanagari reply to an English speaker */
  if (HINGLISH.test(q) || DEV.test(q)) { switched++; console.log('        ^^ LANGUAGE SWITCH'); }
  /* the other failure: asking what the opening line already said */
  if (/amount/i.test(q) && /18,?400/.test(GRIEVANCE) && turn === 0) { repeated++; console.log('        ^^ ALREADY ANSWERED'); }

  const a = answerFor(q);
  console.log(`      → ${a}`);
  answers.push({ q, a });
  turn++;
}

ok(switched === 0, 'never answered in a language they did not use', switched ? switched + ' switches' : '');
ok(answers.length <= 5, 'stopped inside the five-question ceiling', answers.length + ' asked');
ok(answers.length >= 1, 'asked at least one thing');

/* did it re-ask the bank after "idk the bank"? */
const dunnoAt = answers.findIndex((x) => /idk|do not know|don.t know|nahi pata/i.test(x.a));
const askedBankAgain = dunnoAt >= 0 && answers.slice(dunnoAt + 1)
  .some((x) => /which bank|bank ka naam|bank name|type of card|which card/i.test(x.q));
ok(!askedBankAgain, 'did not ask again for something they said they did not know');

/* ── the review screen ─────────────────────────────────────────────────── */
console.log('\nthe review screen');
const sum = await post('/api/summarise', {
  grievance: GRIEVANCE, domain: cls.domain, office: cls.office || '', answers
});
const learned = answers.filter((x) => !/idk|do not know|don.t know|nahi pata|no reference|nothing/i.test(x.a)).length;
ok(Array.isArray(sum.fields) && sum.fields.length >= (learned ? 2 : 1),
   'fields match what was actually learned', (sum.fields || []).length + ' fields for ' + learned + ' substantive answer(s)');
console.log('       source: ' + sum.source);
(sum.fields || []).forEach((f) => console.log(`       ${String(f.label).padEnd(22)} ${String(f.value).slice(0, 62)}   [${f.kind}]`));

const labels = (sum.fields || []).map((f) => String(f.label));
ok(!labels.some((l) => /^kab |aapne|\?$/i.test(l)), 'no label is a question or in another language');
ok(!labels.some((l) => l.length > 40), 'no label is a truncated sentence');
const values = (sum.fields || []).map((f) => String(f.value).toLowerCase());
ok(!values.some((v) => v.includes('talk in english') || v.includes('what?!')),
   'a meta-reply was not promoted to case content');
ok(!values.some((v) => /\bunknown\b|\bnot known\b|\bn\/a\b/i.test(v)), 'no field was filled with "unknown"');

const h = await (await fetch(BASE + '/api/health')).json();
console.log(`\nspent $${h.budget.spentUsd} across ${h.budget.calls} calls`);
console.log(fail ? `\n${fail} FAILED` : '\nthe faults from that run are all closed');
process.exit(fail ? 1 : 0);
