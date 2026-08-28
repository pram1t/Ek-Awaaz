/* Point the endpoints at the stateless conversation.
 *
 * The session id is gone, so /chat takes the transcript and returns the updated one, and the summary
 * takes a transcript rather than an id. The 410 that a lost session used to produce is gone with it:
 * the summary now always answers 200 with something the review screen can render, because a citizen
 * who has answered four questions must never arrive at a blank case.
 */

import fs from 'node:fs';

const F = 'server/api.js';
let s = fs.readFileSync(F, 'utf8');

/* ── the import ─────────────────────────────────────────────────────────────── */
{
  const from = "import { chat, summariseSession, chatAvailable, sessionReport } from './chat.js';";
  const to = "import { chat, summariseTranscript, chatAvailable, conversationReport } from './chat.js';";
  if (s.includes(from)) { s = s.split(from).join(to); console.log('  import updated'); }
  else if (!s.includes('summariseTranscript')) { console.log('  ! import anchor not found'); process.exit(1); }
}

/* ── health ─────────────────────────────────────────────────────────────────── */
{
  const from = '    conversation: Object.assign({ live: chatAvailable() }, sessionReport()),';
  const to = '    conversation: conversationReport(),';
  if (s.includes(from)) { s = s.split(from).join(to); console.log('  health updated'); }
}

/* ── the routes ─────────────────────────────────────────────────────────────── */
{
  const start = s.indexOf('/** THE CONVERSATION');
  if (start < 0) { console.log('  ! route block not found'); process.exit(1); }
  const end = s.indexOf("api.get('/speech/languages'", start);
  if (end < 0) { console.log('  ! route block end not found'); process.exit(1); }

  const routes = [
    '/** THE CONVERSATION — one turn.',
    '    The transcript arrives from the device, is treated as untrusted, and goes back updated. No',
    '    conversation state is held here: a reload resumes, and an instance restart cannot strand',
    '    anybody mid-intake. Turn count is derived from the history rather than sent, so a client can',
    '    only shorten its own context, never inflate its budget. */',
    "api.post('/chat', metered, async (req, res) => {",
    '  const out = await chat(req.body?.messages, req.body?.text);',
    '  res.json(out);',
    '});',
    '',
    '/** The case file, written from the conversation itself.',
    '    Always 200. There is no failure here that justifies showing a citizen a blank review screen',
    '    after they have answered four questions — the fallback is their own first sentence. */',
    "api.post('/chat/summary', metered, async (req, res) => {",
    '  const out = await summariseTranscript(req.body?.messages);',
    '  res.json(out);',
    '});',
    '',
    ''
  ].join('\n');

  s = s.slice(0, start) + routes + s.slice(end);
  console.log('  routes rewritten: POST /chat, POST /chat/summary');
}

fs.writeFileSync(F, s);
console.log('done');
