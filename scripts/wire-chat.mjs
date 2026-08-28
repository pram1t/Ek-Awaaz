/* Wire the conversation endpoints, and repair the mangled first attempt.
 *
 * Writing this inline through `node -e` inside single quotes stripped every quote character in the
 * inserted route, producing `api.post(/chat, ...)` — a regex literal where a string belonged. Same
 * lesson as every other time today: multi-line code goes in a file, not through the shell.
 */

import fs from 'node:fs';

const F = 'server/api.js';
let s = fs.readFileSync(F, 'utf8');

/* ── 1. remove the mangled block, if it is there ───────────────────────────── */
const broken = s.indexOf('api.post(/chat, metered');
if (broken >= 0) {
  const start = s.lastIndexOf('/** THE CONVERSATION', 0, broken) >= 0
    ? s.lastIndexOf('/** THE CONVERSATION')
    : broken;
  const end = s.indexOf("api.get('/speech/languages'", broken);
  if (end < 0) { console.log('! could not bound the mangled block'); process.exit(1); }
  s = s.slice(0, start) + s.slice(end);
  console.log('  removed the mangled block');
}

/* ── 2. the import ─────────────────────────────────────────────────────────── */
if (!s.includes("from './chat.js'")) {
  const a = 'import { classify,';
  if (!s.includes(a)) { console.log('! import anchor not found'); process.exit(1); }
  s = s.replace(a, () => "import { chat, summariseSession, chatAvailable, sessionReport } from './chat.js';\nimport { classify,");
  console.log('  import added');
}

/* ── 3. the routes ─────────────────────────────────────────────────────────── */
if (!s.includes("api.post('/chat'")) {
  const anchor = "api.get('/speech/languages', (_req, res) => res.json({";
  if (!s.includes(anchor)) { console.log('! route anchor not found'); process.exit(1); }

  const route = [
    '/** THE CONVERSATION.',
    '    One turn: the whole message history goes to the model, the model decides what to ask next,',
    '    and the code decides what it is not allowed to ask. The session lives on the server so the',
    '    history is real rather than reassembled from the page on every request. */',
    "api.post('/chat', metered, async (req, res) => {",
    '  const out = await chat(req.body?.sessionId, req.body?.text);',
    '  res.json(out);',
    '});',
    '',
    '/** The case file, written from the conversation itself rather than from slots we collected. */',
    "api.post('/chat/:id/summary', metered, async (req, res) => {",
    '  const out = await summariseSession(req.params.id);',
    "  if (out.error) return res.status(410).json(out);",
    '  res.json(out);',
    '});',
    '',
    anchor
  ].join('\n');

  s = s.replace(anchor, () => route);
  console.log('  POST /chat and POST /chat/:id/summary added');
}

/* ── 4. report both in health, so the demo cannot misreport itself ─────────── */
if (!s.includes('conversation:')) {
  const a = '    speech: speechReport(),';
  if (s.includes(a)) {
    s = s.replace(a, () => a + '\n    conversation: Object.assign({ live: chatAvailable() }, sessionReport()),');
    console.log('  health reports the conversation layer');
  } else {
    console.log('  ! health anchor not found — skipped');
  }
}

fs.writeFileSync(F, s);
console.log('done');
