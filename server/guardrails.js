/* Ek Awaaz — guardrails.

   A prompt is not a guardrail. Everything here is enforced in code, before or after the model
   runs, so a crafted grievance cannot talk its way past it.

   Five jobs:
     1. INPUT   — cap size, strip control characters, redact identifiers the citizen should
                  never have given us, and refuse to treat instructions inside a grievance as
                  instructions to us.
     2. SAFETY  — spot the reports that are not grievances at all (medical, police, fire, harm)
                  and break out to the number that can actually help.
     3. OUTPUT  — validate the model's JSON against the real domain list, cap what it can say,
                  and strip claims it is not allowed to make.
     4. BUDGET  — a hard spend ceiling. Past it, the model layer stops being called at all and
                  the deterministic path takes over. The demo degrades; it never overspends.
     5. RATE    — per-caller limits so one loop cannot drain the credit.
*/

import crypto from 'node:crypto';

/* ----------------------------------------------------------------- 1. INPUT ----- */

export const MAX_INPUT_CHARS = Number(process.env.MAX_INPUT_CHARS || 1200);

/* Things a citizen may type but we must never store or send onward. The brief forbids real
   Aadhaar, PAN, payment and OTP data, and DPDP makes keeping them indefensible anyway. */
const REDACTIONS = [
  // Aadhaar: 12 digits, often spaced 4-4-4. Checked before generic long numbers.
  [/\b(\d[ -]?){11}\d\b/g, '[Aadhaar removed]', 'Aadhaar number'],
  // PAN: five letters, four digits, one letter
  [/\b[A-Z]{5}[0-9]{4}[A-Z]\b/gi, '[PAN removed]', 'PAN'],
  // Card-like: 13-19 digits in groups
  [/\b(?:\d[ -]?){12,18}\d\b/g, '[card number removed]', 'card number'],
  // "OTP is 123456" / "password: hunter2"
  [/\b(otp|password|pin|cvv)\b\s*(is|:|=)?\s*\S+/gi, '$1 [removed]', 'a password or OTP']
];

/* Text inside a grievance is data. If it tries to address the system, we neutralise the framing
   rather than obeying it. We do not reject the report — a real complaint may legitimately quote
   an official's instruction — we just make it inert and flag it. */
const INJECTION = /\b(ignore (all |the )?(previous|above|prior) (instructions?|prompts?)|disregard (the )?(system|above)|you are now|new instructions?|system prompt|act as|jailbreak|reveal your (prompt|instructions))\b/i;

export function sanitizeInput(raw) {
  let text = String(raw == null ? '' : raw);

  // strip control characters and zero-width tricks, keep newlines
  /* Written as a filter, not a character class: a regex literal holding raw control
     characters is unparseable, and escaping it through tooling kept mangling it. */
  text = Array.from(text).filter((ch) => {
    const c = ch.codePointAt(0);
    if (c === 9 || c === 10 || c === 13) return true;             // tab, newline, CR
    if (c < 32 || c === 127) return false;                         // other C0 and DEL
    if (c >= 0x200B && c <= 0x200F) return false;                  // zero-width / bidi
    if (c === 0x2028 || c === 0x2029 || c === 0xFEFF) return false;
    return true;
  }).join('');
  text = text.replace(/\s{3,}/g, '  ').trim();

  const redacted = [];
  for (const [re, replacement, label] of REDACTIONS) {
    re.lastIndex = 0;                 // module-level /g regexes carry state between calls
    if (re.test(text)) {
      redacted.push(label);
      text = text.replace(re, replacement);
    }
  }

  const injection = INJECTION.test(text);

  let truncated = false;
  if (text.length > MAX_INPUT_CHARS) {
    text = text.slice(0, MAX_INPUT_CHARS);
    truncated = true;
  }

  return { text, redacted, injection, truncated, tooShort: text.length < 4 };
}

/* ---------------------------------------------------------------- 2. SAFETY ----- */

/* Not everything typed into a grievance box is a grievance. Filing a medical emergency as a
   21-day case would be actively harmful, so these break out of the flow entirely. */
const EMERGENCY = [
  {
    kind: 'medical',
    re: /\b(ambulance|heart attack|bleeding|unconscious|not breathing|dying|snake ?bite|labour pain|accident (just )?happened)\b/i,
    say: 'This sounds like a medical emergency. Call 108 for an ambulance now. A grievance takes days; that call takes minutes.',
    numbers: [{ label: 'Ambulance', number: '108' }]
  },
  {
    kind: 'harm',
    re: /\b(kill myself|end my life|suicide|jaan de|marna chahta|no reason to live)\b/i,
    say: 'Please talk to someone right now. Tele-MANAS is free, open all day and night, in your language.',
    numbers: [{ label: 'Tele-MANAS', number: '14416' }]
  },
  {
    kind: 'violence',
    re: /\b(beating me|threatening to kill|attacked|assault|rape|kidnap|hostage|goons came|dhamki de)\b/i,
    say: 'This needs the police, not a grievance queue. Call 112. If it is about a woman or a child, 1098 and 181 also answer.',
    numbers: [{ label: 'Emergency', number: '112' }, { label: 'Women', number: '181' }, { label: 'Child', number: '1098' }]
  },
  {
    kind: 'fire',
    re: /\b(fire (broke|spread|in my)|building collapsed|gas leak|cylinder (blast|leak))\b/i,
    say: 'Call 101 for fire and 112 for anything else. Do that before filing anything.',
    numbers: [{ label: 'Fire', number: '101' }, { label: 'Emergency', number: '112' }]
  }
];

export function detectEmergency(text) {
  const hit = EMERGENCY.find((e) => e.re.test(text));
  if (!hit) return null;
  return { kind: hit.kind, message: hit.say, numbers: hit.numbers,
    note: 'You can still file a grievance afterwards, and we will keep what you have written.' };
}

/* ---------------------------------------------------------------- 3. OUTPUT ----- */

/* Phrases the model must never produce. Remedies, amounts and statutory provisions come from
   data/remedies.json, never from the model, so anything of the sort in generated text is an
   invention and gets dropped. */
const BANNED_OUTPUT = [
  /\b(you will (definitely|certainly) (get|win|receive))\b/i,
  /\b(guaranteed|assured) (refund|compensation|payment)\b/i,
  /\bI (am|'m) a lawyer\b/i,
  /\blegal advice\b/i,
  /\b(rs\.?|₹)\s?[\d,]{3,}/i,          // the model must not invent amounts
  /\bsection \d+[A-Z]?\b/i,             // nor cite provisions
  /\b(aadhaar|pan) (number|card)\b/i    // nor ask for identifiers
];

function clean(value, maxLen) {
  let s = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  for (const re of BANNED_OUTPUT) if (re.test(s)) return '';
  if (maxLen && s.length > maxLen) s = s.slice(0, maxLen).trim();
  return s;
}

/**
 * Validate a classification result against reality. Anything the model got wrong is replaced
 * by the deterministic value rather than shown to a citizen.
 */
export function validateClassification(out, { domainKeys, optionKeys, fallback }) {
  const safe = { ...fallback };

  if (out && typeof out === 'object') {
    if (typeof out.domain === 'string' && domainKeys.includes(out.domain)) safe.domain = out.domain;

    const conf = Number(out.confidence);
    safe.confidence = Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : 0.4;

    const title = clean(out.title, 80);
    if (title) safe.title = title;
    const summary = clean(out.summary, 280);
    if (summary) safe.summary = summary;

    safe.area = clean(out.area, 120) || '';
    safe.state = clean(out.state, 40).toLowerCase() || '';
    safe.injury = out.injury === true;
    safe.language = /^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(out.language || '') ? out.language : (fallback.language || 'en');

    if (typeof out.optionKey === 'string' && optionKeys.includes(out.optionKey)) {
      safe.optionKey = out.optionKey;
      const oc = Number(out.optionConfidence);
      safe.optionConfidence = Number.isFinite(oc) ? Math.min(1, Math.max(0, oc)) : 0;
    }

    if (Array.isArray(out.asks)) {
      const asks = out.asks
        .map((a) => ({ q: clean(a && a.q, 140), hint: clean(a && a.hint, 180), ph: clean(a && a.ph, 120) }))
        .filter((a) => a.q.length > 3)
        .slice(0, 3);
      if (asks.length) safe.asks = asks;
    }
  }

  if (!safe.asks || !safe.asks.length) safe.asks = fallback.asks;
  return safe;
}

/** The plain-language rewrite: four short sentences, nothing invented. */
export function validatePlain(out, fallback) {
  if (!out || !Array.isArray(out.plain)) return fallback;
  const lines = out.plain.map((l) => clean(l, 220)).filter(Boolean).slice(0, 4);
  return lines.length >= 2 ? { plain: lines } : fallback;
}

/** A single routing sentence. Must name the office and stay short. */
export function validateSentence(out, fallbackSentence) {
  const s = clean(out && out.sentence, 220);
  return s && s.split(' ').length <= 45 ? s : fallbackSentence;
}

/* ---------------------------------------------------------------- 4. BUDGET ----- */

/* Prices per million tokens. VERIFY THESE against current OpenAI pricing before relying on the
   ceiling — they are the one number here that goes stale on its own. */
const PRICES = {
  'gpt-4o-mini': { in: 0.15, out: 0.60 },
  'gpt-4.1-mini': { in: 0.40, out: 1.60 },
  'gpt-4o': { in: 2.50, out: 10.00 }
};
const DEFAULT_PRICE = { in: 0.60, out: 2.40 }; // deliberately pessimistic for unknown models

/* A circuit breaker against a runaway loop, not a rationing device. Set close to the whole
   credit: the rate limiter is what protects the budget in normal use, and a judge must never
   meet a throttled demo. */
const CEILING_USD = Number(process.env.OPENAI_BUDGET_USD || 4.8);

const spend = { usd: 0, inTokens: 0, outTokens: 0, calls: 0, blocked: 0, startedAt: new Date().toISOString() };

export function priceOf(model) {
  return PRICES[model] || DEFAULT_PRICE;
}

export function budgetLeft() {
  return Math.max(0, CEILING_USD - spend.usd);
}

/** Called before a request. Returns false when the ceiling is reached. */
export function canSpend(estimatedUsd = 0.001) {
  if (spend.usd + estimatedUsd > CEILING_USD) { spend.blocked += 1; return false; }
  return true;
}

/** Called after a request with the usage the API reported. */
export function record(model, usage) {
  const p = priceOf(model);
  const inTok = (usage && (usage.prompt_tokens ?? usage.input_tokens)) || 0;
  const outTok = (usage && (usage.completion_tokens ?? usage.output_tokens)) || 0;
  spend.inTokens += inTok;
  spend.outTokens += outTok;
  spend.usd += (inTok * p.in + outTok * p.out) / 1e6;
  spend.calls += 1;
}

export function budgetReport() {
  return {
    ceilingUsd: CEILING_USD,
    spentUsd: Math.round(spend.usd * 1e6) / 1e6,
    remainingUsd: Math.round(budgetLeft() * 1e6) / 1e6,
    calls: spend.calls,
    blockedCalls: spend.blocked,
    inTokens: spend.inTokens,
    outTokens: spend.outTokens,
    exhausted: budgetLeft() <= 0,
    since: spend.startedAt,
    note: 'Prices are configured in server/guardrails.js and must be checked against current OpenAI pricing.'
  };
}

/* ------------------------------------------------------------------ 5. RATE ----- */

/* Per-caller limits. Cheap in-memory sliding window: enough to stop a loop or a crawler,
   and it costs nothing. */
const WINDOW_MS = 60_000;
const PER_MINUTE = Number(process.env.RATE_PER_MINUTE || 12);
const PER_DAY = Number(process.env.RATE_PER_DAY || 200);
const hits = new Map();

export function rateLimit(key) {
  const now = Date.now();
  let rec = hits.get(key);
  if (!rec) { rec = { recent: [], day: 0, dayStart: now }; hits.set(key, rec); }

  if (now - rec.dayStart > 86_400_000) { rec.day = 0; rec.dayStart = now; }
  rec.recent = rec.recent.filter((t) => now - t < WINDOW_MS);

  if (rec.recent.length >= PER_MINUTE) {
    return { ok: false, retryAfter: Math.ceil((WINDOW_MS - (now - rec.recent[0])) / 1000),
             reason: 'Too many requests in a minute.' };
  }
  if (rec.day >= PER_DAY) {
    return { ok: false, retryAfter: 3600, reason: 'Daily limit for this prototype reached.' };
  }

  rec.recent.push(now);
  rec.day += 1;

  if (hits.size > 5000) {                       // keep the map from growing without bound
    for (const [k, v] of hits) if (now - v.dayStart > 86_400_000) hits.delete(k);
  }
  return { ok: true };
}

/* ------------------------------------------------------------------ CACHE ------- */

/* The single biggest saving. Judges, and anyone testing, type near-identical sentences. A
   normalised hash means the second person to report a broken road costs nothing. */
const CACHE_MAX = Number(process.env.AI_CACHE_MAX || 500);
const cache = new Map();
let hitCount = 0, missCount = 0;

export function cacheKey(...parts) {
  const norm = parts.map((p) => String(p == null ? '' : p).toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()).join('|');
  return crypto.createHash('sha256').update(norm).digest('hex').slice(0, 32);
}

export function cacheGet(key) {
  if (!cache.has(key)) { missCount += 1; return undefined; }
  const value = cache.get(key);
  cache.delete(key); cache.set(key, value);   // LRU touch
  hitCount += 1;
  return value;
}

export function cacheSet(key, value) {
  cache.set(key, value);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}

export function cacheReport() {
  const total = hitCount + missCount;
  return { size: cache.size, max: CACHE_MAX, hits: hitCount, misses: missCount,
           hitRate: total ? Math.round((hitCount / total) * 100) + '%' : '0%' };
}
