/* Scenario 3 — the case record: a timeline, an answer back to the officer, and a question
   the citizen can ask about their own case.

   Three server pieces.

   1. timeline(code) derives the events from the case row, the signatures, the confirmations
      and the messages. Derived, not a second log, so it cannot disagree with the case.

   2. A citizen can answer. On the existing portal a report arrives and that is the end of
      the exchange; here the reply lands on the case, is visible in the record, and — if the
      case was waiting on the citizen — puts it back on the office.

   3. "Ask about this case" is answered from the case record and nothing else. The prompt is
      handed only the facts on file, and the model is told to say plainly when the record does
      not contain the answer. That is enforced twice: in the prompt, and by a code check that
      refuses an answer naming a date or an office the record does not contain. A grievance
      portal that invents a date is worse than one that says it does not know. */

import fs from 'node:fs';

let n = 0;

/* ---------------------------- db.js ---------------------------- */

const DB = 'server/db.js';
let d = fs.readFileSync(DB, 'utf8');

if (!d.includes('CREATE TABLE IF NOT EXISTS messages')) {
  const anchor = '  CREATE TABLE IF NOT EXISTS confirmations (';
  if (!d.includes(anchor)) { console.log('  ! confirmations table not found'); process.exit(1); }
  d = d.replace(anchor, `  CREATE TABLE IF NOT EXISTS messages (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id  INTEGER NOT NULL,
    role     TEXT NOT NULL,
    phone    TEXT,
    text     TEXT NOT NULL,
    added_on TEXT NOT NULL
  );

${anchor}`);
  n++;
}

if (!d.includes('export function addReply')) {
  d += `

/* ---------- the case record ---------- */

/** A citizen answering back. If the case was waiting on them it returns to the office. */
export function addReply(code, phone, text) {
  const found = findByCode(code);
  if (!found) return { error: 'not_found' };
  const row = db.prepare('SELECT * FROM cases WHERE code = ?').get(found.code);

  db.prepare('INSERT INTO messages (case_id, role, phone, text, added_on) VALUES (?, ?, ?, ?, ?)')
    .run(row.id, 'citizen', phone, String(text).slice(0, 1200), today());

  /* Answering an officer's report is not the same as confirming it. The clock goes back to
     the office rather than the case sitting in limbo waiting on the citizen. */
  let movedTo = null;
  if (row.status === 'awaiting_confirmation') {
    db.prepare("UPDATE cases SET status = 'open' WHERE id = ?").run(row.id);
    movedTo = 'open';
  }
  return { case: findByCode(found.code), movedTo };
}

export function messages(caseId) {
  return db.prepare('SELECT role, text, added_on, phone FROM messages WHERE case_id = ? ORDER BY id').all(caseId);
}

/** Every event on the case, derived from the record rather than kept as a parallel log. */
export function timeline(code) {
  const found = findByCode(code);
  if (!found) return { error: 'not_found' };
  const row = db.prepare('SELECT * FROM cases WHERE code = ?').get(found.code);

  const signed = db.prepare('SELECT phone, added_on FROM signatures WHERE case_id = ? ORDER BY id').all(row.id);
  const confirmed = db.prepare('SELECT verdict, added_on FROM confirmations WHERE case_id = ? ORDER BY id').all(row.id);
  const msgs = messages(row.id);

  const events = [];
  const at = (date, title, body, tone) => events.push({ date: date || null, title, body, tone: tone || 'done' });

  at(row.filed_on, 'You described the problem',
     'In your own words. No category was chosen and no department was named.', 'done');

  if (row.office) {
    at(row.filed_on, 'Routed to ' + row.office,
       (row.reason || 'Identified as the office that can act on this.') +
       (row.legal_basis ? ' Basis: ' + row.legal_basis + '.' : ''), 'done');
  } else {
    at(null, 'Awaiting routing', 'The responsible office has not been identified yet.', 'current');
  }

  if (signed.length > 1) {
    at(signed[signed.length - 1].added_on, signed.length + ' households on this case',
       row.target ? 'At ' + row.target + ' it escalates to the ' + (row.escalates_to || 'District Collector') + ' automatically.'
                  : 'Each name is one verified mobile number.', 'done');
  }

  if (row.officer_responded_on) {
    at(row.officer_responded_on, 'The office replied',
       'Their report is on the case. A report does not close it.', 'done');
  }

  for (const m of msgs) {
    at(m.added_on, m.role === 'citizen' ? 'You answered' : 'The office wrote', m.text, 'done');
  }

  for (const c of confirmed) {
    const said = { fixed: 'You said it was fixed', not_fixed: 'You said it was not fixed', partly: 'You said it was partly fixed' };
    at(c.added_on, said[c.verdict] || 'You answered',
       c.verdict === 'not_fixed' ? 'The case reopened with its history intact and the clock running.'
       : c.verdict === 'fixed' ? 'Recorded against your verified mobile number.'
       : 'Partly is not closed. The case stays open.', 'done');
  }

  if (row.status === 'confirmed_fixed') {
    at(row.confirmed_on, 'Closed by you',
       'Confirmed by ' + row.confirmed_by + (row.confirmed_by === 1 ? ' person' : ' people') + '. No officer report closed this.', 'done');
  } else if (row.status === 'awaiting_confirmation') {
    at(null, 'Waiting for you', 'Only you can say whether this is actually fixed.', 'current');
  } else {
    const age = daysSince(row.filed_on);
    at(null, age > 21 ? 'Past the 21-day window' : 'With the office',
       age > 21 ? 'Escalation to the ' + (row.escalates_to || 'next authority') + ' is available.'
                : 'Day ' + Math.min(age + 1, 21) + ' of 21.', 'current');
  }

  return { case: findByCode(found.code), events, messages: msgs };
}
`;
  n++;
}

/* daysSince may not exist under that name */
if (!/function daysSince|const daysSince/.test(d)) {
  d = d.replace('export function addReply', `function daysSince(iso) {
  if (!iso) return 0;
  const then = new Date(iso + 'T00:00:00');
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / 86400000));
}

export function addReply`);
  n++;
}

fs.writeFileSync(DB, d);
console.log('db.js  ' + n + ' additions');

/* ---------------------------- api.js ---------------------------- */

const API = 'server/api.js';
let a = fs.readFileSync(API, 'utf8');

if (a.includes("api.get('/cases/:code/timeline'")) {
  console.log('  = api routes already there');
} else {
  const anchor = `/** CLOSURE GATE — an officer report never closes a case. */`;
  if (!a.includes(anchor)) { console.log('  ! closure gate anchor missing'); process.exit(1); }
  a = a.replace(anchor, `/** THE CASE RECORD — every event, derived from the case rather than a parallel log. */
api.get('/cases/:code/timeline', (req, res) => {
  const out = db.timeline(req.params.code);
  if (out.error) return res.status(404).json({ error: 'No case with that number.' });
  res.json(out);
});

/** A citizen answering back. The old portal has no room for this at all. */
api.post('/cases/:code/reply', (req, res) => {
  const b = req.body || {};
  const phone = digits(b.phone);
  if (phone.length !== 10) return res.status(401).json({ error: 'Verify your mobile number first.' });
  if (digits(b.otp) !== MOCK_OTP) return res.status(401).json({ error: \`Demo mode — the code is \${MOCK_OTP}.\` });

  const clean = sanitizeInput(b.text);
  if (clean.blocked) return res.status(400).json({ error: clean.reason });
  if (clean.tooShort) return res.status(400).json({ error: 'Say a little more than that.' });

  const out = db.addReply(req.params.code, phone, clean.text);
  if (out.error) return res.status(404).json({ error: 'No case with that number.' });
  res.json({
    case: out.case,
    movedTo: out.movedTo,
    message: out.movedTo === 'open'
      ? 'Your answer is on the case, and the case is back with the office.'
      : 'Your answer is on the case.'
  });
});

/** A question about this case, answered from this case. Grounded, and honest when it cannot. */
api.post('/cases/:code/ask', metered, async (req, res) => {
  const found = db.findByCode(req.params.code);
  if (!found) return res.status(404).json({ error: 'No case with that number.' });

  const clean = sanitizeInput(req.body?.question);
  if (clean.blocked) return res.status(400).json({ error: clean.reason });
  if (clean.tooShort) return res.status(400).json({ error: 'What would you like to know?' });

  const out = await answerAboutCase(found, clean.text);
  res.json(out);
});

${anchor}`);
  n++;
}

fs.writeFileSync(API, a);
console.log('api.js patched');
