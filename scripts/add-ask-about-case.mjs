/* "Ask about this case" — answered from the case record and nothing else.

   This is the one place in the product where a citizen asks an open question and gets an
   open answer, so it is also the easiest place to do real harm. If it invents a date, an
   office or a right, someone acts on it. A portal that says "the record does not say" is
   more useful than one that guesses well.

   So the grounding is enforced twice over, and the second time is in code:

   1. The prompt is handed a rendered set of case facts and told to answer only from them.
   2. groundedEnough() then checks the answer back against those facts. Any four-digit year,
      day-month date or rupee figure that does not appear in the record is treated as
      invented and the whole answer is dropped for the honest fallback. Prompts are asked
      not to hallucinate; code is what stops it.

   The fallback is not an error message. It names what the record does hold and points at
   the two things the citizen can actually do, so a refusal still moves them forward. */

import fs from 'node:fs';

const F = 'server/ai.js';
let s = fs.readFileSync(F, 'utf8');

if (s.includes('export async function answerAboutCase')) {
  console.log('  = already there');
  process.exit(0);
}

s += `

/* ---------------------------------------------------------------- ASK ABOUT A CASE ----- */

/** The facts on file, rendered for the model and reused to check what comes back. */
function caseFacts(c) {
  const lines = [
    ['Case number', c.code],
    ['What was reported', c.title],
    ['In their words', c.summary],
    ['Where', c.area],
    ['State', c.state],
    ['Responsible office', c.office],
    ['Why that office', c.reason],
    ['Legal basis', c.legalBasis],
    ['Filed on', c.filedOn],
    ['Status', c.status],
    ['Day count', c.clock],
    ['Past the response window', c.overdue ? 'yes' : 'no'],
    ['Households on the case', c.supporters],
    ['Escalates at', c.target],
    ['Escalates to', c.escalatesTo],
    ['Officer replied on', c.officerRespondedOn],
    ['What the officer wrote', c.officerAtr],
    ['Confirmed fixed on', c.confirmedOn],
    ['Confirmed by', c.confirmedBy],
    ['Times recurred', c.recurrence],
    ['Visibility', c.visibility]
  ].filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== 0);

  return lines.map(([k, v]) => k + ': ' + v).join('\\n');
}

/* Anything that reads as a hard fact and is not in the record is a fabrication. */
const YEAR = /\\b(19|20)\\d{2}\\b/g;
const DATE = /\\b\\d{1,2}\\s+(January|February|March|April|May|June|July|August|September|October|November|December)\\b/gi;
const MONEY = /(?:₹|Rs\\.?\\s?)\\s?[\\d,]+/g;
const DAYS = /\\b\\d{1,3}\\s*(?:days?|din)\\b/gi;

function groundedEnough(answer, facts) {
  const haystack = facts.toLowerCase();
  for (const pattern of [YEAR, DATE, MONEY, DAYS]) {
    const hits = String(answer).match(pattern) || [];
    for (const hit of hits) {
      const needle = hit.toLowerCase().replace(/\\s+/g, ' ').trim();
      /* A bare number inside a longer phrase still has to appear somewhere in the record. */
      const digitsOnly = needle.replace(/[^\\d]/g, '');
      if (haystack.includes(needle)) continue;
      if (digitsOnly && haystack.includes(digitsOnly)) continue;
      return { ok: false, invented: hit };
    }
  }
  return { ok: true };
}

/**
 * Answer a citizen's question about their own case, using only what is recorded on it.
 * Returns { answer, source, grounded } — source is 'model', 'fallback' or 'refused'.
 */
export async function answerAboutCase(c, question) {
  const facts = caseFacts(c);

  const fallback = () => ({
    answer: 'I can only answer from what is on this case, and this is not on it. What the case does '
          + 'record is: it is with ' + (c.office || 'an office not yet identified') + ', filed on '
          + (c.filedOn || 'a date not recorded') + ', and ' + (c.clock || 'no clock is running yet') + '. '
          + 'You can answer the office in your own words below, or say whether the problem is actually fixed.',
    source: 'fallback',
    grounded: true
  });

  if (!client || !canSpend()) return fallback();

  const key = cacheKey('ask', MODEL, c.code, c.status, question);
  const cached = cacheGet(key);
  if (cached) return { answer: cached, source: 'model', grounded: true, cached: true };

  try {
    const out = await ask(
      \`\${SMITI}

Answer the citizen's question about their own grievance, using ONLY the case record below.

Rules, in order of importance:
- If the record does not answer it, say so plainly in one sentence and say what the record
  does hold. Never fill a gap with something reasonable.
- Never state a date, an amount, a day count or an office that is not in the record.
- Do not promise an outcome, a timeline or that anything will be fixed.
- Two or three short sentences. Their language, their words.

CASE RECORD
\${facts}

Reply as JSON: {"answer":""}\`,
      String(question).slice(0, 500),
      { maxTokens: 260, temperature: 0.2 }
    );

    const answer = clean(out && out.answer, 600);
    if (!answer) return fallback();

    /* The prompt asked for grounding; this is what enforces it. */
    const check = groundedEnough(answer, facts + '\\n' + question);
    if (!check.ok) {
      console.warn('[ai] dropped an ungrounded case answer, invented:', check.invented);
      return Object.assign(fallback(), { source: 'refused', invented: check.invented });
    }

    cacheSet(key, answer);
    return { answer, source: 'model', grounded: true };
  } catch (err) {
    console.warn('[ai] ask-about-case fell back:', err.message);
    return fallback();
  }
}
`;

fs.writeFileSync(F, s);
console.log('ai.js — answerAboutCase added');
