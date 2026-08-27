/* Make the intake a conversation instead of a wizard.
 *
 * The complaint was that it feels pre-fixed and the questions do not follow the topic. It was
 * right, and the cause is architectural rather than cosmetic: buildSteps() computed the entire
 * question plan the moment the domain was known — grievance, then two asks, then evidence, then
 * location — and each answer only advanced an index. Smiti never read a reply. Told
 * "25th aug, idk the bank" she moved on to "Anything to attach?", because the plan had already
 * decided that was next before the citizen had said anything.
 *
 * So each turn becomes a model call that sees the transcript and decides the next question, or
 * says it has enough. That is what makes an answer like "I don't know the bank" get handled
 * rather than ignored.
 *
 * Four guardrails, all in code, because a conversational loop is exactly where a prompt starts
 * being treated as a promise:
 *
 *   1. THE SAME SCRIPT BACK. The observed failure was replying "Kab aapne bank ko pehli baar
 *      bataya?" to a citizen writing English. Checked here: the script of the question must
 *      match the script of the citizen's own words, and romanised Hindi is detected by its
 *      function words rather than by its alphabet — otherwise Hinglish passes as English.
 *   2. NOTHING BANNED. The generated question goes through the same askIsBanned filter as the
 *      canned ones, so no account number, card number, Aadhaar or PAN can be asked for.
 *   3. NOTHING TWICE. A question too similar to one already asked is refused.
 *   4. A HARD CEILING. Five questions and the server stops generating, whatever the model
 *      wants. An open loop over a paid API with a citizen at one end needs a wall, not a hope.
 *
 * If any of that trips, or the model is unavailable, the answer is the existing fixed plan.
 * Degrading to the old behaviour is fine; hanging or inventing is not.
 */

import fs from 'node:fs';

/* ─────────────────────────── 1 · server/ai.js ─────────────────────────── */
const AI = 'server/ai.js';
let ai = fs.readFileSync(AI, 'utf8');

if (ai.includes('export async function nextQuestion')) {
  console.log('  = ai.js already has nextQuestion');
} else {
  ai += `

/* ────────────────────────────────────────────── THE NEXT QUESTION ──────────
   One turn of the intake. Reads what has been said and asks the one thing most worth knowing
   next, or reports that enough is known to route. This is what separates a conversation from a
   form: the question depends on the answers. */

/* Romanised Hindi is Latin script, so an alphabet test cannot see it. These are the function
   words that carry it — if the citizen used none and the question uses them, the reply has
   switched language on someone who did not ask it to. */
const HINGLISH = /\\b(aap|aapne|aapka|aapki|kya|kab|kaise|kahan|kyun|hai|hain|tha|thi|nahi|nahin|mera|meri|mujhe|humne|karo|kiya|karna|bataya|bataiye|zaroori|thoda|abhi|baar|pehli|wala|wali)\\b/i;
const DEVANAGARI = /[\\u0900-\\u097F]/;

function scriptOf(text) {
  const t = String(text || '');
  if (DEVANAGARI.test(t)) return 'devanagari';
  if (HINGLISH.test(t)) return 'hinglish';
  return 'latin';
}

/** True when a question answers in a language the citizen did not use. */
export function switchedLanguage(citizenText, question) {
  const theirs = scriptOf(citizenText);
  const ours = scriptOf(question);
  if (theirs === ours) return false;
  /* Devanagari to Devanagari and Latin to Latin are the only safe pairs. Hinglish at a citizen
     writing plain English is the failure this exists to catch. */
  if (theirs === 'latin' && ours === 'hinglish') return true;
  if (theirs === 'latin' && ours === 'devanagari') return true;
  if (theirs === 'devanagari' && ours !== 'devanagari') return true;
  return false;
}

/** Rough similarity, to refuse asking the same thing twice in different words. */
function tooSimilar(a, b) {
  const words = (s) => new Set(String(s).toLowerCase().replace(/[^a-z\\u0900-\\u097F ]/g, '').split(/\\s+/).filter((w) => w.length > 3));
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return false;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return shared / Math.min(A.size, B.size) > 0.6;
}

export const MAX_QUESTIONS = 5;

/**
 * The next thing to ask, given everything said so far.
 * @returns { done, question: {q, hint}|null, source, reason? }
 */
export async function nextQuestion({ grievance, domain, office, answers = [], language = 'en' }) {
  const asked = answers.map((a) => a.q).filter(Boolean);
  const lastCitizen = answers.length ? answers[answers.length - 1].a : grievance;

  /* the wall comes before anything else */
  if (asked.length >= MAX_QUESTIONS) {
    return { done: true, question: null, source: 'ceiling', reason: 'enough asked' };
  }
  if (!client || !canSpend()) {
    return { done: false, question: null, source: 'unavailable' };
  }

  const transcript = [\`They said: \${grievance}\`]
    .concat(answers.map((a) => \`You asked: \${a.q}\\nThey answered: \${a.a}\`))
    .join('\\n\\n');

  try {
    const out = await ask(
      \`\${SMITI}

You are taking a grievance. The office it will go to is already decided; you are only
gathering what that office will need in order to act.

Read the exchange and ask the ONE thing most worth knowing next, or stop.

Stop — return done true and no question — when you have enough that the office could act:
what happened, roughly when, and enough of a location or account to identify it. Do not keep
asking for polish. Three or four questions is a full intake.

Rules:
- One question. Short. The way a person asks, not a form field.
- If their last answer said they do not know something, accept it and move on. Never ask again.
- Never ask which department, ministry or office. That is your job, not theirs.
- Never ask for a full account number, card number, Aadhaar or PAN.
- Reply in the SAME language and script they used. If they wrote English, ask in English.
- The hint is one short line saying why it matters, or an example. It is not a second question.

Problem type: \${domain}. Office it will go to: \${office || 'to be identified'}.

\${transcript}

Reply as JSON: {"done":false,"q":"","hint":""}\`,
      String(lastCitizen || '').slice(0, 600),
      { maxTokens: 180, temperature: 0.4 }
    );

    if (!out) return { done: false, question: null, source: 'unavailable' };
    if (out.done === true) return { done: true, question: null, source: 'model' };

    const q = clean(out.q, 160);
    const hint = clean(out.hint, 220);
    if (!q) return { done: false, question: null, source: 'unavailable' };

    /* guardrail 2 — the same filter the canned asks go through */
    if (askIsBanned(q)) {
      console.warn('[ai] refused a generated ask:', q);
      return { done: false, question: null, source: 'refused', reason: 'banned' };
    }
    /* guardrail 3 — not the same thing again */
    if (asked.some((prev) => tooSimilar(prev, q))) {
      return { done: true, question: null, source: 'model', reason: 'repeat' };
    }
    /* guardrail 1 — the language they used, not the one we prefer */
    if (switchedLanguage(lastCitizen, q)) {
      console.warn('[ai] refused a language switch:', q);
      return { done: false, question: null, source: 'refused', reason: 'language' };
    }

    return { done: false, question: { q, hint }, source: 'model' };
  } catch (err) {
    console.warn('[ai] next question fell back:', err.message);
    return { done: false, question: null, source: 'unavailable' };
  }
}
`;

  /* the banned-ask filter has to be in scope */
  if (!/import .*askIsBanned/.test(ai)) {
    ai = ai.replace("import { correctDomain } from './corrections.js';",
                    "import { correctDomain } from './corrections.js';\nimport { askIsBanned } from './banned-asks.js';");
  }
  fs.writeFileSync(AI, ai);
  console.log('  + ai.js — nextQuestion, with four guardrails');
}

/* ─────────────────────────── 2 · server/api.js ─────────────────────────── */
const API = 'server/api.js';
let api = fs.readFileSync(API, 'utf8');

if (api.includes("api.post('/next'")) {
  console.log('  = api.js already has /next');
} else {
  api = api.replace("import { classify, pickOption, plainLanguage, routingSentence, aiAvailable, answerAboutCase } from './ai.js';",
                    "import { classify, pickOption, plainLanguage, routingSentence, aiAvailable, answerAboutCase, nextQuestion, MAX_QUESTIONS } from './ai.js';");

  const anchor = '/** STEP 4 — file it. Creates the case. Filing into the government channel is simulated. */';
  api = api.replace(anchor, `/** ONE TURN of the intake. The question depends on the answers, which is the whole point. */
api.post('/next', metered, async (req, res) => {
  const b = req.body || {};
  const clean = sanitizeInput(b.grievance);
  if (clean.blocked) return res.status(400).json({ error: clean.reason });

  /* Answers are citizen text and go through the same sanitiser as anything else they type. */
  const answers = Array.isArray(b.answers) ? b.answers.slice(0, MAX_QUESTIONS).map((a) => ({
    q: String(a.q || '').slice(0, 200),
    a: sanitizeInput(a.a).text || String(a.a || '').slice(0, 600)
  })) : [];

  const out = await nextQuestion({
    grievance: clean.text || String(b.grievance || ''),
    domain: String(b.domain || 'other'),
    office: String(b.office || ''),
    answers,
    language: String(b.language || 'en')
  });

  res.json({
    done: !!out.done,
    question: out.question || null,
    source: out.source,
    reason: out.reason || null,
    asked: answers.length,
    max: MAX_QUESTIONS
  });
});

${anchor}`);
  fs.writeFileSync(API, api);
  console.log('  + api.js — POST /next');
}

/* ─────────────────────────── 3 · the client ─────────────────────────── */
const CLIENT = 'public/api-client.js';
let c = fs.readFileSync(CLIENT, 'utf8');
if (!c.includes('nextQuestion:')) {
  c = c.replace("    /* Step 3 — the route screen: office, reason, stronger remedy, joinder match. */",
`    /* One turn of the intake: the next question, given what has been said. */
    nextQuestion: (payload) => call('/next', { method: 'POST', body: payload }),

    /* Step 3 — the route screen: office, reason, stronger remedy, joinder match. */`);
  fs.writeFileSync(CLIENT, c);
  console.log('  + api-client.js — nextQuestion');
} else console.log('  = api-client already has it');
