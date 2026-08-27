/* Decide in code when the intake has enough.
 *
 * The prompt told the model that two questions is usually a complete intake and four is the most
 * that is ever useful. It asked five and had to be stopped by the ceiling, chasing "what type of
 * card was it" and "what does the SMS say" after the citizen had twice said they did not know.
 *
 * That is not a prompt that needs rewording. Each turn is an independent call whose instruction
 * is "ask the next thing, or stop", and asking is the default action — there is no accumulating
 * sense of sufficiency for it to consult. Asking a model to judge when to stop asking is asking
 * it to do the one thing its position in the loop makes hard.
 *
 * So the model keeps the job it is good at, which is phrasing the next question, and code takes
 * the job it is good at, which is counting. Stop when:
 *
 *   - three questions have been answered, or
 *   - two answers in a row were "I don't know", because the topic is closed and pressing a
 *     citizen who has already said they cannot help is the behaviour this product exists to
 *     replace, or
 *   - two questions in and a date is on record, since what happened plus roughly when is what
 *     the office needs to open a file.
 *
 * MAX_QUESTIONS drops from five to four. Five was a ceiling; this is a judgement.
 */

import fs from 'node:fs';

const F = 'server/ai.js';
let s = fs.readFileSync(F, 'utf8');

if (s.includes('function enoughKnown')) { console.log('= already applied'); process.exit(0); }

/* ── the rule ─────────────────────────────────────────────────────────────── */
const DECIDER = `
/* Whether the office could act on what is already on record. Deterministic, because "when to
   stop asking" is a counting problem and the model is answering each turn in isolation. */
const DUNNO = /\\b(idk|dunno|no idea|don'?t know|do not know|nahi pata|nahin pata|pata nahi|malum nahi|not sure|no reference|nothing to attach|none)\\b/i;
const HAS_DATE = /\\b(\\d{1,2}\\s*(st|nd|rd|th)?\\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\\w*\\s*\\d{1,2}|\\d{1,2}[\\/.-]\\d{1,2}|yesterday|last (week|month|year)|since \\w+|\\d+ (days?|weeks?|months?) ago|kal|pichhle)\\b/i;

function enoughKnown(grievance, answers) {
  const said = answers.map((a) => String(a.a || ''));
  const everything = [String(grievance || '')].concat(said).join(' ');

  /* three answered questions is a full intake */
  if (answers.length >= 3) return 'three answers';

  /* two "I don't know" in a row: the citizen has told us they cannot help further */
  const tail = said.slice(-2);
  if (tail.length === 2 && tail.every((a) => DUNNO.test(a))) return 'twice unknown';

  /* what happened plus roughly when is enough to open a file */
  if (answers.length >= 2 && HAS_DATE.test(everything)) return 'what and when on record';

  return null;
}
`;

s = s.replace('export const MAX_QUESTIONS = 5;', DECIDER + '\nexport const MAX_QUESTIONS = 4;');

/* ── apply it before spending a call ─────────────────────────────────────── */
s = s.replace(`  /* the ceiling comes before anything else */
  if (asked.length >= MAX_QUESTIONS) {
    return { done: true, question: null, source: 'ceiling', reason: 'enough asked' };
  }`,
`  /* the ceiling, then the judgement — both before spending a call */
  if (asked.length >= MAX_QUESTIONS) {
    return { done: true, question: null, source: 'ceiling', reason: 'ceiling' };
  }
  const enough = enoughKnown(grievance, answers);
  if (enough) {
    return { done: true, question: null, source: 'sufficient', reason: enough };
  }`);

/* ── the summary must never come back thinner than the conversation ─────── */
s = s.replace(`    if (fields.length < 1) return fallback();
    return { fields, source: 'model' };`,
`    /* The model returned one field for a conversation with three answers once. The grievance is
       always field one whatever it says, and anything the citizen actually told us is appended
       rather than left out — a review screen thinner than the exchange it summarises is a
       screen that loses what someone said. */
    if (!fields.length) return fallback();
    if (!/^(what happened|what went wrong|the problem)/i.test(fields[0].label)) {
      fields.unshift({ key: 'what', label: 'What happened', value: String(grievance || '').trim(), kind: 'text' });
    }
    const covered = fields.map((f) => f.value.toLowerCase()).join(' ');
    const missed = answers
      .map((a) => String(a.a || '').trim())
      .filter((a) => a && !DUNNO.test(a) && !covered.includes(a.toLowerCase().slice(0, 14)));
    if (missed.length) {
      fields.push({ key: 'added', label: 'What you added', value: missed.join(' · '), kind: 'text' });
    }
    return { fields: fields.slice(0, 7), source: 'model' };`);

fs.writeFileSync(F, s);
console.log('ai.js — the stop decision is in code; MAX_QUESTIONS 5 -> 4');
console.log('ai.js — the summary can no longer be thinner than the conversation');
