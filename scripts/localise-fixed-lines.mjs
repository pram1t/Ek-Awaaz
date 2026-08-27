/* Smiti's fixed lines must be in the citizen's language too.
 *
 * The model already answers in whatever language the citizen used — that part works. But two of the
 * questions in every intake are written by us, not by the model: the one about attachments and the
 * one about where the problem is. Those were hardcoded English, so an Odia speaker got Odia from
 * the model and English from us, in the same conversation. That is worse than a consistently
 * English interface, because it looks like she stopped understanding.
 *
 * There are about eight such lines. They are the same for everyone, so translating them is cheap
 * and cacheable: eight strings times eleven languages, computed once each and held. It is not a
 * strings table — a strings table for eleven languages is a week of work and would still be English
 * everywhere it was not updated — it is the model translating our own eight sentences on demand.
 *
 * Falls back to English silently. A person who gets one English question in an Odia conversation is
 * mildly jarred; a person who gets a blank screen because a translation call failed has lost their
 * grievance.
 */

import fs from 'node:fs';

const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13, 10);

function patch(file, edits) {
  let s = fs.readFileSync(file, 'utf8');
  const nl = (t) => (s.indexOf(CRLF) >= 0 ? t.split(LF).join(CRLF) : t);
  let n = 0;
  for (const [from, to] of edits) {
    const f = nl(from);
    if (s.indexOf(f) < 0) { console.log('  ! anchor miss in ' + file + ': ' + from.slice(0, 54)); continue; }
    s = s.split(f).join(nl(to));
    n++;
  }
  if (n) fs.writeFileSync(file, s);
  return n;
}

/* ── 1. the translator ─────────────────────────────────────────────────────── */
{
  const F = 'server/ai.js';
  if (fs.readFileSync(F, 'utf8').includes('export async function localise')) {
    console.log('  = ai.js already has localise()');
  } else {
    const n = patch(F, [[
      'export async function plainLanguage(atr, language = \'en\') {',
      `/* Translate our own fixed lines into the citizen's language.
   Only ever called with sentences we wrote ourselves, so there is nothing here to be grounded
   against — it is not answering a question, it is saying the same thing in another language.
   Cached per language, because these are the same eight lines for everybody. */
export async function localise(texts, lang) {
  const list = (Array.isArray(texts) ? texts : [texts]).map((t) => String(t || '').slice(0, 300));
  if (!list.length) return { lines: [], source: 'empty' };
  /* English in, English out — no call, no spend. */
  if (!lang || /^en/i.test(lang)) return { lines: list, source: 'passthrough' };

  const key = cacheKey('localise', lang, list.join('|'));
  const cached = cacheGet(key);
  if (cached) return { lines: cached, source: 'model', cached: true };

  const system = \`You translate short interface lines for a government grievance service in India.

Reply as JSON: {"lines":["...","..."]} — one entry per input line, in the same order, same count.

Rules:
- Translate into \${lang}, in that language's own script.
- Keep it as short and as plain as the English. These are things a person reads on a phone.
- Official names of offices, schemes and laws stay as they are: Block Development Officer, EPFO,
  NFSA, RBI Ombudsman. Someone has to be able to ask for them by name.
- Numbers, dates and rupee amounts stay exactly as given.
- Do not add anything, explain anything or make anything more polite.\`;

  try {
    const out = await ask(system, JSON.stringify({ lines: list }), { maxTokens: 500, temperature: 0.1 });
    const lines = Array.isArray(out?.lines) ? out.lines.map((l) => String(l || '').trim()) : [];
    /* A translation that lost or invented a line cannot be lined up with the questions it is for. */
    if (lines.length !== list.length || lines.some((l) => !l)) {
      return { lines: list, source: 'fallback', why: 'count_mismatch' };
    }
    cacheSet(key, lines);
    return { lines, source: 'model' };
  } catch (err) {
    /* Silently English. One English question in an Odia conversation is a blemish; a failed
       screen is a lost grievance. */
    return { lines: list, source: 'fallback', why: err.message };
  }
}

export async function plainLanguage(atr, language = 'en') {`
    ]]);
    if (n) console.log('  server/ai.js               localise() added');
  }
}

/* ── 2. the endpoint ───────────────────────────────────────────────────────── */
{
  const F = 'server/api.js';
  const s = fs.readFileSync(F, 'utf8');
  if (s.includes("api.post('/say'")) {
    console.log('  = api.js already has /say');
  } else {
    const n = patch(F, [[
      "api.get('/speech/languages', (_req, res) => res.json({",
      `/** Our own fixed lines, in the citizen's language. Metered like any other model call. */
api.post('/say', metered, async (req, res) => {
  const lines = Array.isArray(req.body?.lines) ? req.body.lines.slice(0, 12) : [];
  const lang = String(req.body?.lang || 'en-IN').slice(0, 8);
  if (!lines.length) return res.json({ lines: [], source: 'empty' });
  const out = await localise(lines, lang);
  res.json(out);
});

api.get('/speech/languages', (_req, res) => res.json({`
    ]]);
    if (n) {
      /* make sure it is imported */
      let t = fs.readFileSync(F, 'utf8');
      if (!/localise/.test(t.split('\n').filter((l) => l.includes("from './ai.js'")).join(''))) {
        const line = t.split('\n').findIndex((l) => l.includes("from './ai.js'"));
        const src = t.split('\n');
        src[line] = src[line].replace('}', ', localise }').replace(', ,', ',');
        t = src.join('\n');
        fs.writeFileSync(F, t);
      }
      console.log('  server/api.js              POST /say added');
    }
  }
}

/* ── 3. the client asks for them ───────────────────────────────────────────── */
{
  const F = 'public/api-client.js';
  if (fs.readFileSync(F, 'utf8').includes('say:')) {
    console.log('  = api-client already has say()');
  } else {
    const n = patch(F, [[
      "    nextQuestion: (payload) => call('/next', { method: 'POST', body: payload }),",
      `    nextQuestion: (payload) => call('/next', { method: 'POST', body: payload }),

    /* Our own fixed lines, in the citizen's language. */
    say: (lines, lang) => call('/say', { method: 'POST', body: { lines, lang } }),`
    ]]);
    if (n) console.log('  public/api-client.js       say() added');
  }
}

/* ── 4. the chat uses it for the questions we wrote ourselves ──────────────── */
{
  const F = 'public/report.html';
  const s = fs.readFileSync(F, 'utf8');
  if (s.includes('async function askLocalised')) {
    console.log('  = report.html already localises');
  } else {
    const n = patch(F, [[
      'function advance() {',
      `/* The model's questions already come back in the citizen's language. These two do not, because
   we wrote them — so they are translated before being asked. English is the silent fallback. */
async function askLocalised(entry) {
  const lang = spokenLang();
  if (!lang || /^en/i.test(lang) || !window.EAAPI || !EAAPI.say) {
    ask(entry.q, entry.hint, entry.chips);
    return;
  }
  const wanted = [entry.q, entry.hint || ''].filter(Boolean);
  const out = await EAAPI.say(wanted, lang);
  const got = out && !out.error && Array.isArray(out.lines) && out.lines.length === wanted.length
    ? out.lines : wanted;
  ask(got[0], entry.hint ? got[1] : null, entry.chips);
}

function advance() {`
    ], [
      `  const entry = steps[step];
  ask(entry.q, entry.hint, entry.chips);`,
      `  const entry = steps[step];
  /* Only our own lines need translating; the model's asks arrive already in their language. */
  if (entry.key === 'evidence' || entry.key === 'location') askLocalised(entry);
  else ask(entry.q, entry.hint, entry.chips);`
    ]]);
    if (n) console.log('  public/report.html         static questions localised (' + n + ' edits)');
  }
}

console.log('\ndone');
