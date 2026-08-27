/* Ek Awaaz — HTTP API.

   What is real here: classification, follow-up generation, the routing decision and its stated
   reason, the remedy-ladder lookup, joinder/dedup/signature counting, escalation, and the
   citizen-confirmed closure gate.

   What is mocked, because the brief instructs it: OTP, identity, filing into CPGRAMS / EPFiGMS /
   RBI CMS / Meri Sadak / any state portal, and officer actions. No live government system is
   contacted anywhere in this file. */

import express, { Router } from 'express';
import * as db from './db.js';
import { routing, remedies } from './db.js';
import { classify, pickOption, plainLanguage, routingSentence, aiAvailable } from './ai.js';
import { sanitizeInput, detectEmergency, rateLimit, budgetReport, cacheReport, MAX_INPUT_CHARS } from './guardrails.js';
import { speak, listen, speechAvailable, speechReport, ttsLanguages, etag, VOICE } from './speech.js';

const api = Router();
const MOCK_OTP = process.env.MOCK_OTP || '123456';
const digits = (v) => String(v || '').replace(/\D/g, '');
const today = () => new Date().toISOString().slice(0, 10);

function daysSince(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 86400000));
}

/* ---------- resolve a domain (+ option) into an office, a channel and a remedy ---------- */

function resolve(domainKey, optionKey, ctx = {}) {
  const domain = routing.domains[domainKey] || routing.domains.other;
  let node = domain;
  let assumed = false;
  if (domain.disambiguator) {
    const opts = domain.disambiguator.options;
    let opt = optionKey ? opts.find((o) => o.key === optionKey) : null;
    if (!opt) {
      // Nothing chosen and the model was not confident. Fall to the marked default and SAY SO,
      // rather than leaving the office unresolved.
      opt = opts.find((o) => o.default) || opts[0];
      assumed = true;
    }
    node = opt;
    optionKey = opt.key;
  }

  // "Rajnagar Ward 4, Patna district" -> block is "Rajnagar", not "Rajnagar Ward 4".
  const place = (ctx.area || '').split(',')[0].replace(/\s+(ward|sector|block|village)\s*\S*$/i, '').trim();
  const office = String(node.office || 'To be identified')
    .replace('{block}', ctx.block || place || 'your')
    .replace('{city}', ctx.city || place || 'your city')
    .replace('{discom}', ctx.discom || 'your distribution company');

  const channelKey = node.route || 'cpgrams';
  const channel = routing.channels[channelKey] || routing.channels.cpgrams;

  const helplineKey = (ctx.state || '').toLowerCase();
  const helpline = routing.helplines[helplineKey] || routing.helplines.default;

  return {
    domain: domainKey,
    domainLabel: domain.label,
    optionKey: optionKey || null,
    assumed,
    tierChoices: domain.disambiguator
      ? { question: domain.disambiguator.question, hint: domain.disambiguator.hint,
          options: domain.disambiguator.options.map((o) => ({ key: o.key, label: o.label, tier: o.tier })) }
      : null,
    tier: node.tier || domain.tier || 'Unknown',
    office,
    reason: node.reason || domain.reason || null,
    legalBasis: node.legal_basis || domain.legal_basis || null,
    channelKey,
    channel: channel.label,
    channelStatus: channel.status,
    routeExists: channelKey !== 'none',
    fallback: node.fallback || null,
    helpline: channelKey === 'none' ? helpline : null,
    visibility: domain.visibility === 'both' ? 'public' : (domain.visibility || 'private'),
    dedupAssetType: domain.dedup_asset_type || null,
    identifiers: domain.identifiers || [],
    warning: domain.warning || null,
    allowNameWithheld: !!domain.allow_name_withheld,
    remedyKey: node.remedy || domain.remedy || null,
    note: domain.note || null
  };
}

/* ---------- remedy ladder: is a stronger route open, and is it open YET? ---------- */

function remedyFor(remedyKey, ctx = {}) {
  if (!remedyKey) return null;
  const r = remedies.remedies[remedyKey];
  if (!r) return null;

  let open = true;
  let days = null;

  if (r.gate?.type === 'days_since') {
    days = daysSince(ctx[r.gate.field]);
    open = days != null && days >= r.gate.days;
  } else if (r.gate?.type === 'flag') {
    open = ctx[r.gate.field] === r.gate.equals;
  }

  const line = open
    ? String(r.after_gate || '').replace('{days}', days ?? '')
    : (r.before_gate || null);

  return {
    key: remedyKey,
    title: r.title,
    forum: r.forum,
    where: r.where,
    teeth: r.teeth,
    clock: r.clock,
    provision: r.provision,
    open,
    daysElapsed: days,
    line,
    caveat: r.caveat || null,
    scope: r.scope || null,
    built: r.built !== false,
    disclaimer: remedies._disclaimer
  };
}

/* Model-backed endpoints are rate limited per caller. Reads are not — they cost nothing. */
function metered(req, res, next) {
  const who = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'local';
  const gate = rateLimit(who);
  if (!gate.ok) {
    res.set('Retry-After', String(gate.retryAfter));
    return res.status(429).json({ error: gate.reason + ' This is a prototype on a small budget.', retryAfter: gate.retryAfter });
  }
  next();
}

/* =========================== ROUTES =========================== */

api.get('/health', (_req, res) => {
  res.json({
    ok: true,
    ai: aiAvailable() ? 'live' : 'fallback',
    model: aiAvailable() ? (process.env.OPENAI_MODEL || 'gpt-4o-mini') : null,
    mockOtp: MOCK_OTP,
    storage: db.storageMode,
    storageNote: db.storageNote,
    budget: budgetReport(),
    cache: cacheReport(),
    speech: speechReport(),
    maxInputChars: MAX_INPUT_CHARS,
    disclosure: 'Independent prototype. Filing, officer actions and identities are simulated. No live government system is contacted.'
  });
});

/** STEP 1 — the citizen has said what happened.
    Sanitise, check it is not an emergency, then classify and write the follow-ups. */
api.post('/intake', metered, async (req, res) => {
  const clean = sanitizeInput(req.body?.text);
  if (clean.tooShort) return res.status(400).json({ error: 'Tell me what happened first.' });

  /* Some things typed into this box are not grievances. Filing a medical emergency as a
     21-day case would be actively harmful, so we break out before spending a model call. */
  const emergency = detectEmergency(clean.text);
  if (emergency) {
    return res.json({ emergency, text: clean.text, redacted: clean.redacted, aiSource: 'guardrail' });
  }

  const c = await classify(clean.text);
  const domain = routing.domains[c.domain] || routing.domains.other;
  const resolved = resolve(c.domain, c.optionKey || null, { area: c.area, state: c.state });

  res.json({
    text: clean.text,
    /* Told plainly rather than silently: if we stripped an identifier, the citizen should know. */
    redacted: clean.redacted,
    truncated: clean.truncated,
    injectionIgnored: clean.injection,
    domain: c.domain,
    domainLabel: domain.label,
    confidence: c.confidence,
    optionKey: c.optionKey || null,
    title: c.title,
    summary: c.summary,
    area: c.area || '',
    state: c.state || '',
    injury: !!c.injury,
    language: c.language || 'en-IN',
    asks: c.asks,
    identifiers: resolved.identifiers,
    disambiguator: domain.disambiguator
      ? { question: domain.disambiguator.question, hint: domain.disambiguator.hint,
          options: domain.disambiguator.options.map((o) => ({ key: o.key, label: o.label })) }
      : null,
    warning: resolved.warning,
    allowNameWithheld: resolved.allowNameWithheld,
    /* Ask only where visibility is genuinely a choice. A ration complaint is both personal and
       communal; an unplaced report might go either way. A provident fund claim is nobody else's
       business, and low classifier confidence does not change that. */
    askVisibility: domain.visibility === 'both' || c.domain === 'other',
    aiSource: c.source,
    cached: !!c.cached
  });
});

/** STEP 3 — the route screen. Office, reason, stronger remedy, and any joinder match. */
api.post('/route', metered, async (req, res) => {
  const b = req.body || {};
  const text = String(b.text || '');
  const answers = Array.isArray(b.answers) ? b.answers : [];

  let optionKey = b.optionKey || null;
  if (!optionKey) optionKey = await pickOption(text, b.domain, answers);

  const ctx = {
    area: b.area, state: (b.state || '').toLowerCase(), block: b.block, city: b.city,
    injury: !!b.injury, complained_on: b.complained_on, claim_date: b.claim_date
  };

  const resolved = resolve(b.domain, optionKey, ctx);
  const { sentence, source } = await routingSentence({ text }, resolved, b.language || 'en');
  const remedy = remedyFor(resolved.remedyKey, ctx);

  const cell = b.cell || (resolved.dedupAssetType && b.area
    ? `${String(b.area).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${b.domain}`
    : null);

  const match = resolved.visibility === 'public'
    ? db.findMatch({ domain: b.domain, cell, area: b.area, state: ctx.state })
    : null;

  const domainDef = routing.domains[b.domain] || routing.domains.other;
  res.json({
    ...resolved,
    askVisibility: domainDef.visibility === 'both' || b.domain === 'other',
    cell,
    sentence,
    sentenceSource: source,
    remedy,
    match: match ? {
      code: match.code, title: match.title, area: match.area, office: match.office,
      supporters: match.supporters, target: match.target, clock: match.clock,
      recurrence: match.recurrence, escalatesTo: match.escalatesTo,
      prompt: `${match.supporters} ${match.supporters === 1 ? 'household has' : 'households have'} already reported this. Add your name instead of filing a new case?`
    } : null,
    needsOptionChoice: !optionKey && !!routing.domains[b.domain]?.disambiguator
  });
});

/** MOCK OTP — send. Nothing is texted; the code is returned so the demo cannot dead-end. */
api.post('/otp/send', (req, res) => {
  const phone = digits(req.body?.phone);
  if (phone.length !== 10) return res.status(400).json({ error: 'Enter a 10-digit mobile number.' });
  res.json({ sent: true, phone, mock: true, hint: `Demo mode — enter ${MOCK_OTP}` });
});

/** MOCK OTP — verify. */
api.post('/otp/verify', (req, res) => {
  const phone = digits(req.body?.phone);
  const code = digits(req.body?.code);
  if (code !== MOCK_OTP) return res.status(401).json({ error: `Demo mode — the code is ${MOCK_OTP}.` });
  res.json({ verified: true, phone, mock: true });
});

/** STEP 4 — file it. Creates the case. Filing into the government channel is simulated. */
api.post('/cases', (req, res) => {
  const b = req.body || {};
  const phone = digits(b.phone);
  if (phone.length !== 10) return res.status(401).json({ error: 'Verify your mobile number first.' });
  if (digits(b.otp) !== MOCK_OTP) return res.status(401).json({ error: `Demo mode — the code is ${MOCK_OTP}.` });

  const resolved = resolve(b.domain, b.optionKey, { area: b.area, state: b.state });
  const created = db.createCase({
    domain: b.domain,
    optionKey: b.optionKey,
    title: b.title,
    summary: b.summary,
    area: b.area,
    state: b.state,
    cell: b.cell,
    office: resolved.office,
    reason: b.sentence || resolved.reason,
    legalBasis: resolved.legalBasis,
    channel: resolved.channel,
    remedyKey: resolved.remedyKey,
    visibility: b.visibility || resolved.visibility,
    nameWithheld: !!b.nameWithheld,
    escalatesTo: b.escalatesTo || null,
    asks: b.asks || [],
    answers: b.answers || [],
    phone
  });

  res.status(201).json({
    case: created,
    filedTo: { channel: resolved.channel, status: resolved.channelStatus, simulated: true },
    disclosure: `Sent to ${resolved.office}. Filing into ${resolved.channel} is simulated in this prototype.`
  });
});

/** Public wall — what is already reported near you. This is how joinder is actually reached. */
api.get('/cases', (req, res) => {
  res.json({ cases: db.publicCases({ state: (req.query.state || '').toLowerCase() || null, limit: 24 }) });
});

api.get('/cases/:code', (req, res) => {
  const found = db.findByCode(req.params.code);
  if (!found) return res.status(404).json({ error: 'No case with that number.' });
  const domain = routing.domains[found.domain];
  res.json({
    case: found,
    asks: found.asks?.length ? found.asks : (domain?.disambiguator ? [] : []),
    joinable: found.visibility !== 'private' && found.status !== 'confirmed_fixed'
  });
});

/** JOINDER — one signature per verified mobile. Fifty filings become one case. */
api.post('/cases/:code/support', (req, res) => {
  const b = req.body || {};
  const phone = digits(b.phone);
  if (phone.length !== 10) return res.status(401).json({ error: 'Verify your mobile number first.' });
  if (digits(b.otp) !== MOCK_OTP) return res.status(401).json({ error: `Demo mode — the code is ${MOCK_OTP}.` });

  const out = db.addSignature(req.params.code, phone, b.note);
  if (out.error === 'not_found') return res.status(404).json({ error: 'No case with that number.' });
  if (out.error === 'not_joinable') {
    return res.status(400).json({ error: 'This is a personal case. Only you can see it, so nobody else can add their name to it.' });
  }

  const c = out.case;
  res.json({
    case: c,
    already: out.already,
    escalated: !!out.escalated,
    message: out.already
      ? 'Your name is already on this case. One signature per mobile number.'
      : `You are the ${c.supporters}${ordinal(c.supporters)} household on this case.` +
        (c.target ? ` At ${c.target} it escalates to the ${c.escalatesTo || 'District Collector'} automatically.` : ''),
    privacy: 'Your name is never shown to other signatories.'
  });
});

/** CLOSURE GATE — an officer report never closes a case. */
api.post('/cases/:code/confirm', (req, res) => {
  const b = req.body || {};
  const phone = digits(b.phone);
  const verdict = ['fixed', 'not_fixed', 'partly'].includes(b.verdict) ? b.verdict : null;
  if (!verdict) return res.status(400).json({ error: 'Say fixed, not fixed, or partly.' });
  if (phone.length !== 10) return res.status(401).json({ error: 'Verify your mobile number first.' });

  const out = db.confirmCase(req.params.code, phone, verdict);
  if (out.error) return res.status(404).json({ error: 'No case with that number.' });

  res.json({
    case: out.case,
    confirmations: out.confirmations,
    needed: out.needed,
    message: {
      fixed: out.case.status === 'confirmed_fixed'
        ? `Confirmed fixed by ${out.confirmations} ${out.confirmations === 1 ? 'person' : 'people'}.`
        : `Recorded. A public case needs ${out.needed} confirmations before it closes — ${out.confirmations} so far.`,
      not_fixed: 'The case is open again, with its whole history intact. The clock resumes.',
      partly: 'Recorded as partly fixed. The case stays open.'
    }[verdict]
  });
});

/** SIMULATED officer reply, plus the plain-language rewrite. Explicitly mocked. */
api.post('/cases/:code/simulate-reply', metered, async (req, res) => {
  const atr = String(req.body?.atr || '').trim() ||
    'With reference to the captioned grievance, the undersigned is directed to state that the ' +
    'concerned Junior Engineer has inspected the site and necessary rectification of the ' +
    'affected stretch has been carried out through the empanelled agency vide work order ' +
    'No. 4471/JE-II. The instant representation is accordingly treated as disposed of at this end.';

  const out = db.simulateOfficerReply(req.params.code, atr);
  if (out.error) return res.status(404).json({ error: 'No case with that number.' });

  const plain = await plainLanguage(atr, req.body?.language || 'en');
  res.json({ case: out.case, atr, plain: plain.plain, aiSource: plain.source, simulated: true });
});


/* ------------------------------- SPEECH -------------------------------
   Both keys stay on the server. The browser posts audio here and gets audio back, and never
   sees a credential. Metered against its own rupee ceiling in speech.js. */

/** Smiti says a line. Cached hard — she says the same forty-odd lines to everyone. */
api.post('/tts', metered, async (req, res) => {
  if (!speechAvailable()) {
    return res.status(503).json({ error: 'Voice is not available right now. The words are on screen.' });
  }
  const clean = sanitizeInput(req.body?.text);
  if (clean.tooShort) return res.status(400).json({ error: 'Nothing to say.' });

  const out = await speak(clean.text, {
    lang: req.body?.lang || 'hi-IN',
    speaker: req.body?.voice || VOICE
  });
  if (out.error) return res.status(502).json({ error: out.error });

  res.set({
    'Content-Type': out.mime,
    'Content-Length': String(out.audio.length),
    'Cache-Control': 'public, max-age=86400',
    ETag: '"' + etag(out.audio) + '"',
    'X-Speech-Lang': out.lang,
    'X-Speech-Cached': String(out.cached)
  });
  res.send(out.audio);
});

/** The citizen speaks. Raw audio in, text out. */
api.post('/stt', metered, express.raw({ type: 'audio/*', limit: '8mb' }), async (req, res) => {
  if (!speechAvailable()) {
    return res.status(503).json({ error: 'We cannot listen right now. Please type it instead.' });
  }
  const out = await listen(req.body, {
    lang: req.query.lang || 'unknown',
    mime: req.get('content-type') || 'audio/webm'
  });
  if (out.error) return res.status(502).json({ error: out.error });

  /* Run the transcript through the same input guardrails as typed text: an Aadhaar number
     spoken aloud must be redacted exactly as one that was typed. */
  const clean = sanitizeInput(out.text);
  res.json({
    text: clean.text,
    redacted: clean.redacted,
    lang: out.lang,
    confidence: out.confidence,
    emergency: detectEmergency(clean.text)
  });
});

api.get('/speech/languages', (_req, res) => res.json({
  speak: ttsLanguages(),
  voice: VOICE,
  note: 'Saaras understands more languages than Bulbul can speak. These are the ones Smiti can say aloud.'
}));

api.get('/me/:phone', (req, res) => {
  const phone = digits(req.params.phone);
  /* A row from the first look, so the name can be asked exactly once. */
  db.seePerson(phone);
  res.json(Object.assign(db.myCases(phone), { profile: db.profile(phone) }));
});

/** The one fact no grievance can supply. Optional: nothing is gated on having answered. */
api.post('/me/:phone/name', (req, res) => {
  const phone = digits(req.params.phone);
  if (phone.length !== 10) return res.status(401).json({ error: 'Verify your mobile number first.' });
  if (digits(req.body?.otp) !== MOCK_OTP) return res.status(401).json({ error: `Demo mode — the code is ${MOCK_OTP}.` });

  const clean = sanitizeInput(String(req.body?.name || ''));
  if (clean.blocked) return res.status(400).json({ error: clean.reason });
  const out = db.setName(phone, clean.text || req.body?.name);
  if (out.error) return res.status(400).json({ error: 'Tell me what to call you, or skip it.' });
  res.json({ person: out });
});

api.get('/dashboard', (_req, res) => res.json(db.dashboard()));

api.get('/reference/remedies', (_req, res) => {
  res.json({
    disclaimer: remedies._disclaimer,
    remedies: Object.entries(remedies.remedies).map(([key, r]) => ({
      key, title: r.title, forum: r.forum, teeth: r.teeth, clock: r.clock,
      provision: r.provision, caveat: r.caveat || null, built: r.built !== false
    }))
  });
});

api.get('/reference/routing', (_req, res) => {
  res.json({
    domains: Object.entries(routing.domains).map(([key, d]) => ({
      key, label: d.label, visibility: d.visibility,
      tiers: d.disambiguator
        ? d.disambiguator.options.map((o) => ({
            key: o.key, label: o.label, tier: o.tier, office: o.office,
            legalBasis: o.legal_basis, route: o.route,
            routeExists: o.route !== 'none', fallback: o.fallback || null
          }))
        : [{ tier: d.tier, office: d.office, legalBasis: d.legal_basis, route: d.route, routeExists: d.route !== 'none' }]
    })),
    channels: routing.channels
  });
});

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export default api;
