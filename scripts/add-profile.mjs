/* "My information" — a profile assembled from what the citizen already said.

   The complaint that made this project worth building is that the current portal asks for
   everything again, every time. So this does not add a profile form. It reads the grievances
   already filed and shows the facts back, and every line names the grievance it came from —
   which is both the honest thing and the whole argument: nothing here was asked twice.

   The one field genuinely not derivable is a name, so that is asked once, on first login,
   and never again.

   Two rules kept deliberately:
   - the name is optional, and a case can still be filed without one. Nothing is gated on it.
   - the profile is derived on read, never a second copy of the truth. There is no way for it
     to drift from the cases it describes, because it is a view of them. */

import fs from 'node:fs';

/* ---------------- db.js ---------------- */

const DB = 'server/db.js';
let d = fs.readFileSync(DB, 'utf8');
let n = 0;

if (d.includes('CREATE TABLE IF NOT EXISTS people')) {
  console.log('  = people table already there');
} else {
  const anchor = `  CREATE TABLE IF NOT EXISTS signatures (`;
  if (!d.includes(anchor)) { console.log('  ! signatures table not found'); process.exit(1); }
  d = d.replace(anchor, `  CREATE TABLE IF NOT EXISTS people (
    phone      TEXT PRIMARY KEY,
    name       TEXT,
    created_on TEXT NOT NULL,
    updated_on TEXT
  );

${anchor}`);
  n++;
}

if (!d.includes('export function getPerson')) {
  d += `

/* ---------- the person behind the mobile number ----------

   A row exists from the first login, whether or not a name was given, so "we have asked
   already" is distinguishable from "they have not answered yet". */

export function getPerson(phone) {
  const row = db.prepare('SELECT phone, name, created_on FROM people WHERE phone = ?').get(phone);
  return row ? { phone: row.phone, name: row.name || null, since: row.created_on } : null;
}

export function seePerson(phone) {
  db.prepare('INSERT OR IGNORE INTO people (phone, created_on) VALUES (?, ?)').run(phone, today());
  return getPerson(phone);
}

export function setName(phone, name) {
  const clean = String(name || '').replace(/\\s+/g, ' ').trim().slice(0, 60);
  if (!clean) return { error: 'empty' };
  db.prepare(\`INSERT INTO people (phone, name, created_on, updated_on) VALUES (?, ?, ?, ?)
              ON CONFLICT(phone) DO UPDATE SET name = excluded.name, updated_on = excluded.updated_on\`)
    .run(phone, clean, today(), today());
  return getPerson(phone);
}

/** Everything we know, and where each part of it came from. Derived, never stored twice. */
export function profile(phone) {
  const person = getPerson(phone);
  const filed = db.prepare('SELECT * FROM cases WHERE phone = ? ORDER BY id').all(phone).map(shape);
  const signed = db.prepare(
    'SELECT c.code, c.title, s.added_on, s.note FROM cases c JOIN signatures s ON s.case_id = c.id WHERE s.phone = ? ORDER BY s.id'
  ).all(phone);

  /* Keep the first sighting of each fact and remember which case carried it, so a repeated
     answer does not read as two separate pieces of knowledge. */
  const seen = new Map();
  const remember = (kind, label, value, source) => {
    const v = String(value == null ? '' : value).trim();
    if (!v || v.toLowerCase() === 'none attached') return;
    const key = kind + '|' + v.toLowerCase();
    if (seen.has(key)) { seen.get(key).alsoIn.push(source); return; }
    seen.set(key, { kind, label, value: v, from: source, alsoIn: [] });
  };

  for (const c of filed) {
    if (c.area) remember('place', 'Where you reported from', c.area, c.code);
    if (c.state) remember('place', 'State', titleCase(c.state), c.code);
    if (c.office) remember('office', 'An office your case reached', c.office, c.code);

    /* answers_json keys are positional (ask0, ask1); the question text lives in asks_json */
    const asks = c.asks || [];
    for (const { q, a } of (c.answers || [])) {
      if (!q || q === 'evidence') continue;
      const m = /^ask(\\d+)$/.exec(q);
      const label = m ? (asks[+m[1]]?.q || 'Something you told us') : LABELS[q] || titleCase(q);
      if (q === 'grievance' || q === 'location') continue;   /* already covered above / too long */
      remember('said', label, a, c.code);
    }
  }

  const facts = [...seen.values()];
  return {
    person: person || { phone, name: null, since: null },
    hasName: !!(person && person.name),
    counts: {
      filed: filed.length,
      supported: signed.length,
      confirmedFixed: filed.filter((c) => c.status === 'confirmed_fixed').length,
      reopened: filed.filter((c) => c.status === 'reopened').length,
      awaitingYou: filed.filter((c) => c.status === 'awaiting_confirmation').length
    },
    places: facts.filter((f) => f.kind === 'place'),
    offices: facts.filter((f) => f.kind === 'office'),
    said: facts.filter((f) => f.kind === 'said'),
    supported: signed.map((s) => ({ code: s.code, title: s.title, on: s.added_on, note: s.note || null }))
  };
}

const LABELS = {
  'Which bank': 'Which bank',
  'Which bank ': 'Which bank'
};

function titleCase(s) {
  return String(s || '').replace(/\\b\\w/g, (c) => c.toUpperCase());
}
`;
  n++;
}

fs.writeFileSync(DB, d);
console.log('db.js updated (' + n + ' additions)');

/* ---------------- api.js ---------------- */

const API = 'server/api.js';
let a = fs.readFileSync(API, 'utf8');
let m = 0;

const meOld = `api.get('/me/:phone', (req, res) => res.json(db.myCases(digits(req.params.phone))));`;
const meNew = `api.get('/me/:phone', (req, res) => {
  const phone = digits(req.params.phone);
  /* A row from the first look, so the name can be asked exactly once. */
  db.seePerson(phone);
  res.json(Object.assign(db.myCases(phone), { profile: db.profile(phone) }));
});

/** The one fact no grievance can supply. Optional: nothing is gated on having answered. */
api.post('/me/:phone/name', (req, res) => {
  const phone = digits(req.params.phone);
  if (phone.length !== 10) return res.status(401).json({ error: 'Verify your mobile number first.' });
  if (digits(req.body?.otp) !== MOCK_OTP) return res.status(401).json({ error: \`Demo mode — the code is \${MOCK_OTP}.\` });

  const clean = sanitizeInput(String(req.body?.name || ''));
  if (clean.blocked) return res.status(400).json({ error: clean.reason });
  const out = db.setName(phone, clean.text || req.body?.name);
  if (out.error) return res.status(400).json({ error: 'Tell me what to call you, or skip it.' });
  res.json({ person: out });
});`;

if (a.includes("api.post('/me/:phone/name'")) {
  console.log('  = name endpoint already there');
} else if (!a.includes(meOld)) {
  console.log('  ! /me route not found');
} else {
  a = a.replace(meOld, meNew);
  m++;
}

fs.writeFileSync(API, a);
console.log('api.js updated (' + m + ' additions)');
