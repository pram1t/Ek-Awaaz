/* Add /api/tts and /api/stt to server/api.js.

   Written as a file because these strings contain quotes and template syntax that bash -e keeps
   mangling — that has cost real time twice already in this project. */

import fs from 'node:fs';

const f = 'server/api.js';
let s = fs.readFileSync(f, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';

if (s.includes("/tts'")) { console.log('speech routes already present'); process.exit(0); }

/* imports */
s = s.replace(
  "import { sanitizeInput, detectEmergency, rateLimit, budgetReport, cacheReport, MAX_INPUT_CHARS } from './guardrails.js';",
  "import { sanitizeInput, detectEmergency, rateLimit, budgetReport, cacheReport, MAX_INPUT_CHARS } from './guardrails.js';" + eol +
  "import { speak, listen, speechAvailable, speechReport, ttsLanguages, etag, VOICE } from './speech.js';"
);

/* health */
s = s.replace(
  '    cache: cacheReport(),',
  '    cache: cacheReport(),' + eol + '    speech: speechReport(),'
);

const ROUTES = [
  '',
  '/* ------------------------------- SPEECH -------------------------------',
  '   Both keys stay on the server. The browser posts audio here and gets audio back, and never',
  '   sees a credential. Metered against its own rupee ceiling in speech.js. */',
  '',
  '/** Smiti says a line. Cached hard — she says the same forty-odd lines to everyone. */',
  "api.post('/tts', metered, async (req, res) => {",
  '  if (!speechAvailable()) {',
  "    return res.status(503).json({ error: 'Voice is not available right now. The words are on screen.' });",
  '  }',
  '  const clean = sanitizeInput(req.body?.text);',
  "  if (clean.tooShort) return res.status(400).json({ error: 'Nothing to say.' });",
  '',
  '  const out = await speak(clean.text, {',
  "    lang: req.body?.lang || 'hi-IN',",
  '    speaker: req.body?.voice || VOICE',
  '  });',
  '  if (out.error) return res.status(502).json({ error: out.error });',
  '',
  '  res.set({',
  "    'Content-Type': out.mime,",
  "    'Content-Length': String(out.audio.length),",
  "    'Cache-Control': 'public, max-age=86400',",
  "    ETag: '\"' + etag(out.audio) + '\"',",
  "    'X-Speech-Lang': out.lang,",
  "    'X-Speech-Cached': String(out.cached)",
  '  });',
  '  res.send(out.audio);',
  '});',
  '',
  '/** The citizen speaks. Raw audio in, text out. */',
  "api.post('/stt', metered, express.raw({ type: 'audio/*', limit: '8mb' }), async (req, res) => {",
  '  if (!speechAvailable()) {',
  "    return res.status(503).json({ error: 'We cannot listen right now. Please type it instead.' });",
  '  }',
  '  const out = await listen(req.body, {',
  "    lang: req.query.lang || 'unknown',",
  "    mime: req.get('content-type') || 'audio/webm'",
  '  });',
  '  if (out.error) return res.status(502).json({ error: out.error });',
  '',
  '  /* Run the transcript through the same input guardrails as typed text: an Aadhaar number',
  '     spoken aloud must be redacted exactly as one that was typed. */',
  '  const clean = sanitizeInput(out.text);',
  '  res.json({',
  '    text: clean.text,',
  '    redacted: clean.redacted,',
  '    lang: out.lang,',
  '    confidence: out.confidence,',
  '    emergency: detectEmergency(clean.text)',
  '  });',
  '});',
  '',
  "api.get('/speech/languages', (_req, res) => res.json({",
  '  speak: ttsLanguages(),',
  '  voice: VOICE,',
  "  note: 'Saaras understands more languages than Bulbul can speak. These are the ones Smiti can say aloud.'",
  '}));',
  '',
  "api.get('/me/:phone'"
].join(eol);

s = s.replace("api.get('/me/:phone'", ROUTES);

/* express.raw needs the express default import */
if (!s.includes("import express")) {
  s = s.replace("import { Router } from 'express';", "import express, { Router } from 'express';");
}

fs.writeFileSync(f, s);
console.log('added /api/tts, /api/stt, /api/speech/languages');
