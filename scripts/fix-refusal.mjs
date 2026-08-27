/* A refused question must mean "ask something else", not "stop asking".
 *
 * The guardrail worked: the model's second question contained "account number", askIsBanned
 * caught it, and it never reached the citizen. Correct. But the refusal returned no question and
 * the caller read that as the end of the intake — so a working guardrail ended the conversation
 * after one turn. The protection became the outage.
 *
 * Now a refusal is a correction. The model is told what was wrong with its question and asked
 * again; if the second attempt also fails, the next unused hand-written ask for that domain is
 * served, so the citizen always gets a sensible next question. Only when nothing is left does
 * the intake finish.
 *
 * One retry, not a loop: two attempts and a canned fallback is bounded, and an unbounded retry
 * against a paid API driven by a filter the model keeps tripping is how a budget disappears.
 */

import fs from 'node:fs';

const F = 'server/ai.js';
let s = fs.readFileSync(F, 'utf8');

if (s.includes('attempt === 2')) { console.log('= already applied'); process.exit(0); }

/* the whole generator body is replaced so the retry can wrap it */
const from = s.indexOf('export async function nextQuestion({ grievance, domain, office, answers = [], language = \'en\' }) {');
if (from < 0) { console.log('! nextQuestion not found'); process.exit(1); }
const end = s.indexOf('\n}\n', s.indexOf('} catch (err) {', from));
if (end < 0) { console.log('! could not bound nextQuestion'); process.exit(1); }

const NEXT = `export async function nextQuestion({ grievance, domain, office, answers = [], language = 'en', cannedAsks = [] }) {
  const asked = answers.map((a) => a.q).filter(Boolean);
  const lastCitizen = answers.length ? answers[answers.length - 1].a : grievance;

  /* the ceiling comes before anything else */
  if (asked.length >= MAX_QUESTIONS) {
    return { done: true, question: null, source: 'ceiling', reason: 'enough asked' };
  }

  /* Whatever happens below, the citizen gets a next question if one is still owed. A guardrail
     that fires must not be able to end the intake — that turns protection into an outage, which
     is exactly what happened when a banned ask returned nothing and the caller read it as done. */
  const canned = () => {
    const unused = cannedAsks.find((a) => a && a.q && !asked.some((p) => tooSimilar(p, a.q)));
    if (!unused) return { done: true, question: null, source: 'exhausted' };
    return { done: false, question: { q: unused.q, hint: unused.hint || '' }, source: 'canned' };
  };

  if (!client || !canSpend()) return canned();

  const transcript = [\`They said: \${grievance}\`]
    .concat(answers.map((a) => \`You asked: \${a.q}\\nThey answered: \${a.a}\`))
    .join('\\n\\n');

  /* Two attempts. The second is told what was wrong with the first, which is the difference
     between a retry and a repeat. */
  let correction = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    let out;
    try {
      out = await ask(
        \`\${SMITI}

You are taking a grievance. The office it will go to is already decided; you are only gathering
what that office will need in order to act.

Read the exchange and ask the ONE thing most worth knowing next, or stop.

Stop — return done true and no question — when you have enough that the office could act: what
happened, roughly when, and enough of a location or reference to identify it. Do not ask for
polish. Three or four questions is a full intake.

Rules:
- One question. Short. The way a person asks, not a form field.
- If their last answer said they do not know something, accept it and move on. Never ask again.
- Never ask which department, ministry or office. That is your job, not theirs.
- Never ask for a full account number, card number, Aadhaar or PAN. A reference, docket, UAN or
  consumer number is fine; the full account number is not.
- Reply in the SAME language and script they used. If they wrote English, ask in English.
- The hint is one short line saying why it matters. It is not a second question.
\${correction}
Problem type: \${domain}. Office it will go to: \${office || 'to be identified'}.

\${transcript}

Reply as JSON: {"done":false,"q":"","hint":""}\`,
        String(lastCitizen || '').slice(0, 600),
        { maxTokens: 180, temperature: attempt === 2 ? 0.2 : 0.4 }
      );
    } catch (err) {
      console.warn('[ai] next question threw:', err.message);
      return canned();
    }

    if (!out) return canned();
    if (out.done === true) return { done: true, question: null, source: 'model' };

    const q = clean(out.q, 160);
    const hint = clean(out.hint, 220);
    if (!q) return canned();

    if (askIsBanned(q)) {
      console.warn('[ai] refused a generated ask (banned):', q);
      correction = '\\nYour previous attempt asked for a full account, card, Aadhaar or PAN number. '
        + 'Ask for something else entirely — the date, the amount, a reference from the statement.\\n';
      continue;
    }
    if (asked.some((prev) => tooSimilar(prev, q))) {
      correction = '\\nYour previous attempt repeated a question already asked. Ask about something '
        + 'genuinely not yet covered, or stop.\\n';
      continue;
    }
    if (switchedLanguage(lastCitizen, q)) {
      console.warn('[ai] refused a language switch:', q);
      correction = '\\nYour previous attempt replied in a different language from the one they used. '
        + 'Write the question in exactly the language and script of their own words.\\n';
      continue;
    }

    return { done: false, question: { q, hint }, source: attempt === 2 ? 'model-retry' : 'model' };
  }

  /* both attempts tripped a guardrail — hand over a written one rather than stopping */
  console.warn('[ai] both attempts refused; serving a canned ask');
  return canned();
}`;

s = s.slice(0, from) + NEXT + s.slice(end + 2);
fs.writeFileSync(F, s);
console.log('ai.js — a refusal now corrects and retries, then falls back to a written ask');

/* the endpoint has to pass the canned asks through */
const API = 'server/api.js';
let a = fs.readFileSync(API, 'utf8');
if (!a.includes('cannedAsks')) {
  a = a.replace(`  const out = await nextQuestion({
    grievance: clean.text || String(b.grievance || ''),
    domain: String(b.domain || 'other'),
    office: String(b.office || ''),
    answers,
    language: String(b.language || 'en')
  });`,
`  /* The written asks for this domain travel with the request, so a refused question can be
     replaced by a sensible one instead of ending the intake. */
  const d = routing.domains[String(b.domain || 'other')] || {};

  const out = await nextQuestion({
    grievance: clean.text || String(b.grievance || ''),
    domain: String(b.domain || 'other'),
    office: String(b.office || ''),
    answers,
    language: String(b.language || 'en'),
    cannedAsks: Array.isArray(d.asks) ? d.asks : []
  });`);
  fs.writeFileSync(API, a);
  console.log('api.js — canned asks passed to the generator');
}
