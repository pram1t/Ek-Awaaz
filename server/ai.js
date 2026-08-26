/* Ek Awaaz — the model layer.
   This is the part the hackathon brief does NOT allow us to mock: classification, follow-up
   generation, the routing rationale and the plain-language rewrite are real model calls.

   Every function degrades gracefully. If OPENAI_API_KEY is absent, the model errors, or the
   response fails to parse, we fall back to deterministic keyword rules and set
   `source: 'fallback'` on the result. The UI shows that honestly rather than breaking — a
   reviewer must always be able to finish the journey. */

import OpenAI from 'openai';
import { routing } from './db.js';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const aiAvailable = () => Boolean(client);

const DOMAIN_LIST = Object.entries(routing.domains)
  .map(([key, d]) => `${key} — ${d.label}`)
  .join('\n');

async function ask(system, user, { maxTokens = 700 } = {}) {
  if (!client) throw new Error('no_api_key');
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: maxTokens
  });
  return JSON.parse(res.choices[0].message.content);
}

/* ---------------- 1. Classify + generate follow-ups ---------------- */

const CLASSIFY_SYSTEM = `You are the intake layer of Ek Awaaz, an Indian citizen grievance router.

A citizen has described a problem in one or two sentences, in any Indian language.
Your job:
1. Pick exactly ONE domain key from this list:
${DOMAIN_LIST}

2. Write 2 or 3 follow-up questions — the questions a competent Grievance Redressal Officer
   would have to ask before acting. Ask only what changes the outcome: which stretch, which
   office, which date, how many affected, whether anyone was hurt, what identifier is needed.
   NEVER ask which ministry or which category — the system decides that.
   Each question needs a short hint and a concrete example placeholder.

3. Draft a one-line title (max 9 words) and a one-sentence factual summary.

4. Detect the location the citizen mentioned, if any, and the Indian state if inferable.

5. Set injury=true only if the citizen says someone was hurt or something was damaged.

6. Set confidence 0-1 for the domain choice.

Write questions in the SAME language the citizen used. Be plain. Never use the words
"grievance", "lodge", "category", "ministry" or "disposed" in anything you write.

Return JSON only:
{"domain":"...","confidence":0.0,"title":"...","summary":"...","area":"...","state":"...",
 "injury":false,"language":"...",
 "asks":[{"q":"...","hint":"...","ph":"..."}]}`;

const KEYWORDS = [
  ['infra.road', /pothole|road|sadak|सड़क|गड्ढ|highway|street|rasta|रास्ता|tar|damaged road/i],
  ['infra.water', /water|pani|पानी|tap|handpump|नल|supply|tanker/i],
  ['infra.power', /electric|power|bijli|बिजली|outage|transformer|current|meter|light/i],
  ['money.pf', /\bpf\b|provident|epfo|epf|uan|भविष्य निधि/i],
  ['money.tax_refund', /refund|income tax|itr|244a|आयकर|tds/i],
  ['money.bank', /bank|बैंक|debit|upi|atm|fraud|loan|account|धोखा/i],
  ['supply.ration', /ration|राशन|pds|fair price|kerosene|wheat|rice|anaj/i],
  ['work.mgnrega', /mgnrega|nrega|मनरेगा|job card|wages|मजदूरी|majduri/i],
  ['money.pmkisan', /kisan|किसान|instalment|installment|samman nidhi/i],
  ['property.housing', /builder|flat|rera|possession|मकान|land record|mutation|ज़मीन|jamin/i],
  ['travel.rail', /train|railway|रेल|irctc|station|ticket|pnr/i],
  ['telecom.service', /sim|network|recharge|internet|broadband|मोबाइल|telecom|jio|airtel|bsnl/i],
  ['integrity.bribe', /bribe|रिश्वत|rishwat|ghoos|घूस|paisa maanga|demanded money|extort/i],
  ['office.inaction', /office|clerk|दफ्तर|दफ़्तर|no reply|pending|file stuck|sarkari/i]
];

function fallbackClassify(text) {
  const t = String(text || '');
  const hit = KEYWORDS.find(([, re]) => re.test(t));
  const domain = hit ? hit[0] : 'other';
  const generic = [
    { q: 'Where exactly is this?', hint: 'A landmark is enough — a school, a shop, a bus stop.', ph: 'Example: near the primary school gate' },
    { q: 'Since when has this been a problem?', hint: 'An approximate month is fine.', ph: 'Example: since the first rain in June' },
    { q: 'Has it caused you a loss or an injury?', hint: 'Say no if it has not.', ph: 'Example: my scooter axle broke on 4 August' }
  ];
  return {
    domain,
    confidence: hit ? 0.55 : 0.2,
    title: t.trim().split(/[.\n]/)[0].slice(0, 60) || 'Untitled report',
    summary: t.trim().slice(0, 240),
    area: '',
    state: '',
    injury: /injur|hurt|accident|fell|fract|गिर|चोट|घायल|damag|broke|broken|टूट/i.test(t),
    language: /[ऀ-ॿ]/.test(t) ? 'hi' : 'en',
    asks: generic.slice(0, 2),
    source: 'fallback'
  };
}

export async function classify(text) {
  if (!client) return fallbackClassify(text);
  try {
    const out = await ask(CLASSIFY_SYSTEM, `Citizen said:\n"""${String(text).slice(0, 2000)}"""`);
    if (!out.domain || !routing.domains[out.domain]) out.domain = fallbackClassify(text).domain;
    if (!Array.isArray(out.asks) || !out.asks.length) out.asks = fallbackClassify(text).asks;
    out.asks = out.asks.slice(0, 3);
    out.source = 'model';
    return out;
  } catch (err) {
    console.warn('[ai] classify fell back:', err.message);
    return fallbackClassify(text);
  }
}

/* ---------------- 2. Which disambiguator option applies ---------------- */

export async function pickOption(text, domainKey, answers = []) {
  const domain = routing.domains[domainKey];
  if (!domain?.disambiguator) return null;
  const opts = domain.disambiguator.options;

  if (!client) return null;
  try {
    const out = await ask(
      `Choose which option best fits what the citizen described. Return JSON
{"key":"<one of the keys>","confidence":0.0}
If genuinely unclear, return {"key":null,"confidence":0}. Never guess between a national
highway and a village road — that distinction decides who is legally responsible.`,
      `Options:\n${opts.map((o) => `${o.key} — ${o.label}`).join('\n')}\n\n` +
      `Citizen said: """${text}"""\nAnswers so far: ${JSON.stringify(answers)}`,
      { maxTokens: 120 }
    );
    return opts.some((o) => o.key === out.key) && out.confidence >= 0.6 ? out.key : null;
  } catch (err) {
    console.warn('[ai] pickOption fell back:', err.message);
    return null;
  }
}

/* ---------------- 3. Plain-language rewrite of an officer reply ---------------- */

const PLAIN_SYSTEM = `Rewrite an Indian government Action Taken Report for the citizen who filed it.

Exactly four short sentences, in this order:
1. What was decided.
2. What it means for you.
3. What happens next, and when.
4. What to do if this is wrong.

Rules: no file-noting language, no "the undersigned", no reference numbers in the prose, no
"disposed". Write in the language named below. Plain words a person with limited schooling
reads once and understands.

Return JSON: {"plain":["...","...","...","..."]}`;

export async function plainLanguage(atr, language = 'en') {
  const fallback = {
    plain: [
      'The office has replied to your report.',
      'Read their reply below — we could not simplify it automatically this time.',
      'If nothing has actually changed on the ground, say so and the case stays open.',
      'You can also add a photo as proof.'
    ],
    source: 'fallback'
  };
  if (!client) return fallback;
  try {
    const out = await ask(PLAIN_SYSTEM, `Language: ${language}\n\nAction Taken Report:\n"""${String(atr).slice(0, 3000)}"""`);
    if (!Array.isArray(out.plain) || out.plain.length < 2) return fallback;
    return { plain: out.plain.slice(0, 4), source: 'model' };
  } catch (err) {
    console.warn('[ai] plainLanguage fell back:', err.message);
    return fallback;
  }
}

/* ---------------- 4. One-line routing rationale ---------------- */

export async function routingSentence(caseDraft, resolved, language = 'en') {
  const base = resolved.reason || 'This goes to the office that can act on it.';
  if (!client) return { sentence: base, source: 'fallback' };
  try {
    const out = await ask(
      `Write ONE sentence telling the citizen where their report is going and why, in the named
language. Name the office. If it is NOT going to a central ministry, say so explicitly — that
is the point. Under 30 words. No jargon. Return JSON {"sentence":"..."}`,
      `Language: ${language}\nOffice: ${resolved.office}\nLegal basis: ${resolved.legalBasis || 'n/a'}\n` +
      `Stock reason: ${base}\nWhat the citizen said: """${caseDraft.text || ''}"""`,
      { maxTokens: 150 }
    );
    return { sentence: out.sentence || base, source: 'model' };
  } catch (err) {
    console.warn('[ai] routingSentence fell back:', err.message);
    return { sentence: base, source: 'fallback' };
  }
}
