/* The review screen becomes a summary of the conversation, not a transcript of it.
 *
 * What it did: took each question asked, truncated it to 22 characters, upper-cased it, and used
 * that as a field label. So a question that came back in Hinglish became the field name
 * "KAB AAPNE BANK KO PEHL", and a citizen's confused reply — "what?! please talk in english" —
 * was stored and displayed as case content. The screen a citizen reads before agreeing to file
 * was showing them the machinery instead of their case.
 *
 * What it does now: one model call reads the whole exchange and returns named fields — what
 * happened, when, where, the amount, the reference — each with a real label, a value drawn from
 * everything said rather than from a single answer, and a kind that decides which control edits
 * it. Meta-replies and non-answers are dropped rather than promoted to case data.
 *
 * The fallback matters as much as the model here. When there is no model, fields are built from
 * the answers with FIXED labels — never derived from the question text. The failure that
 * produced "KAB AAPNE BANK KO PEHL" cannot recur even with the model switched off, because the
 * code path that made a label out of a question is gone.
 */

import fs from 'node:fs';

/* ───────────────────────────── server/ai.js ───────────────────────────── */
const AI = 'server/ai.js';
let ai = fs.readFileSync(AI, 'utf8');

if (ai.includes('export async function summariseIntake')) {
  console.log('  = ai.js already has summariseIntake');
} else {
  ai += `

/* ─────────────────────────────────────────── THE CASE, SUMMARISED ──────────
   The citizen reads this screen and decides whether to file. It must show their case, not our
   transcript — named fields drawn from the whole exchange, with anything that was not an answer
   left out. */

const FIELD_KINDS = new Set(['text', 'date', 'place', 'money', 'reference']);

export async function summariseIntake({ grievance, domain, office, answers = [] }) {
  /* Fixed labels, never derived from the question. This is the path that used to build a label
     by truncating whatever had been asked. */
  const fallback = () => {
    const fields = [{ key: 'what', label: 'What happened', value: String(grievance || '').trim(), kind: 'text' }];
    const said = answers.map((a) => String(a.a || '').trim()).filter(Boolean);
    if (said.length) {
      fields.push({ key: 'detail', label: 'What you added', value: said.join(' · '), kind: 'text' });
    }
    return { fields, source: 'fallback' };
  };

  if (!client || !canSpend()) return fallback();

  const transcript = [\`Their grievance: \${grievance}\`]
    .concat(answers.map((a) => \`Asked: \${a.q}\\nAnswered: \${a.a}\`)).join('\\n\\n');

  try {
    const out = await ask(
      \`\${SMITI}

Turn this exchange into the case record the citizen will read back before filing.

Return between two and six fields. Each has a short label in sentence case, a value written
from everything they said, and a kind from: text, date, place, money, reference.

Rules:
- The first field is always what happened, in their own words, tidied but not rewritten.
- Only include a field they actually gave you. Never invent a value and never write "unknown".
- If they said they do not know something, leave that field out entirely.
- Ignore anything that was not an answer — a question back, a complaint about the language, an
  aside. That is conversation, not case content.
- Labels are what the thing IS ("When it happened", "Which bank", "Where"), never the question
  that was asked.
- Same language and script the citizen used.

Problem type: \${domain}. Office: \${office || 'to be identified'}.

\${transcript}

Reply as JSON: {"fields":[{"label":"","value":"","kind":"text"}]}\`,
      String(grievance || '').slice(0, 800),
      { maxTokens: 420, temperature: 0.2 }
    );

    const raw = Array.isArray(out && out.fields) ? out.fields : [];
    const fields = raw.slice(0, 6).map((f, i) => ({
      key: 'f' + i,
      label: clean(f.label, 40) || 'Detail',
      value: clean(f.value, 400),
      kind: FIELD_KINDS.has(f.kind) ? f.kind : 'text'
    })).filter((f) => f.value);

    if (fields.length < 1) return fallback();
    return { fields, source: 'model' };
  } catch (err) {
    console.warn('[ai] summary fell back:', err.message);
    return fallback();
  }
}
`;
  fs.writeFileSync(AI, ai);
  console.log('  + ai.js — summariseIntake');
}

/* ───────────────────────────── server/api.js ───────────────────────────── */
const API = 'server/api.js';
let api = fs.readFileSync(API, 'utf8');

if (api.includes("api.post('/summarise'")) {
  console.log('  = api.js already has /summarise');
} else {
  api = api.replace('nextQuestion, MAX_QUESTIONS } from', 'nextQuestion, MAX_QUESTIONS, summariseIntake } from');
  const anchor = "/** ONE TURN of the intake.";
  api = api.replace(anchor, `/** THE CASE AS THE CITIZEN WILL READ IT. Named fields from the exchange, not the exchange. */
api.post('/summarise', metered, async (req, res) => {
  const b = req.body || {};
  const clean = sanitizeInput(b.grievance);
  if (clean.blocked) return res.status(400).json({ error: clean.reason });

  const answers = Array.isArray(b.answers) ? b.answers.slice(0, 8).map((a) => ({
    q: String(a.q || '').slice(0, 200),
    a: sanitizeInput(a.a).text || String(a.a || '').slice(0, 600)
  })) : [];

  const out = await summariseIntake({
    grievance: clean.text || String(b.grievance || ''),
    domain: String(b.domain || 'other'),
    office: String(b.office || ''),
    answers
  });
  res.json(out);
});

${anchor}`);
  fs.writeFileSync(API, api);
  console.log('  + api.js — POST /summarise');
}

/* ───────────────────────────── the client ───────────────────────────── */
let c = fs.readFileSync('public/api-client.js', 'utf8');
if (!c.includes('summarise:')) {
  c = c.replace('    nextQuestion: (payload) => call(\'/next\', { method: \'POST\', body: payload }),',
`    nextQuestion: (payload) => call('/next', { method: 'POST', body: payload }),

    /* The case as the citizen will read it back: named fields, not the transcript. */
    summarise: (payload) => call('/summarise', { method: 'POST', body: payload }),`);
  fs.writeFileSync('public/api-client.js', c);
  console.log('  + api-client.js — summarise');
} else console.log('  = api-client already has summarise');

/* ───────────── session: survive a new tab ───────────── */
let s = fs.readFileSync('public/session.js', 'utf8');
if (s.includes('localStorage.getItem(KEY)')) {
  console.log('  = session already on localStorage');
} else {
  s = s.replace(
    "/* Ek Awaaz — shared session, login and join-a-case flow.\n   Session lives in sessionStorage: it survives a refresh and clears when the tab closes. */",
    `/* Ek Awaaz — shared session, login and join-a-case flow.

   The session lives in localStorage, not sessionStorage. It was the latter, which is per-tab:
   logging in on My grievances and then opening the report page — a normal thing to do, and the
   first thing anyone evaluating this will do — lost the session and asked for the mobile number
   a second time. Privacy was the reason for sessionStorage, and it is a real reason, but the
   answer to it is a log-out control that works rather than a session that silently evaporates
   between tabs. Log out is in the header of every signed-in page. */`);
  s = s.split('sessionStorage.getItem(KEY)').join('localStorage.getItem(KEY)');
  s = s.split('sessionStorage.setItem(KEY').join('localStorage.setItem(KEY');
  s = s.split('sessionStorage.removeItem(KEY').join('localStorage.removeItem(KEY');
  fs.writeFileSync('public/session.js', s);
  console.log('  + session.js — login survives a new tab');
}

/* the draft in api-client is separate and stays per-tab, which is correct for a draft */
console.log('\ndone');
