/* Ek Awaaz — data layer.
   SQLite via better-sqlite3. The database is SEEDED ON BOOT from data/seed.json, so a fresh
   deploy always starts with the same synthetic case history. Cases created during a session
   persist for the life of the process — enough for a demo, and it removes any need for a
   persistent disk on the host. */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
/* Storage location.
   A persistent host (Render, Railway, Fly, your laptop) gets a real file and cases survive.
   Serverless hosts have a read-only filesystem, so there we run in memory: the seed history is
   always present, and cases created during a session live as long as that instance does.
   `storageMode` is reported by /api/health so the limitation is never hidden. */
const SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_PATH = process.env.DB_PATH || (SERVERLESS ? ':memory:' : path.join(ROOT, 'data', 'ekawaaz.db'));
export const storageMode = DB_PATH === ':memory:' ? 'memory' : 'file';
export const storageNote = storageMode === 'memory'
  ? 'Serverless instance: seeded case history is always present, but cases you create live only as long as this instance. Set DB_PATH to a writable path, or host on a persistent process, for durable storage.'
  : SERVERLESS
    ? `File at ${DB_PATH} on this instance. A case you file survives while this instance stays warm, which is minutes to hours, and is not shared with other instances. Seeded history is always present. A persistent process or an external database is what makes it durable.`
    : `Persistent file at ${DB_PATH}.`;

export const routing = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'routing.json'), 'utf8'));
export const remedies = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'remedies.json'), 'utf8'));
const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed.json'), 'utf8'));

export const stats = seed.stats;

const db = new Database(DB_PATH);
if (storageMode === 'file') db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    code                TEXT UNIQUE NOT NULL,
    domain              TEXT NOT NULL,
    option_key          TEXT,
    title               TEXT NOT NULL,
    summary             TEXT,
    area                TEXT,
    state               TEXT,
    cell                TEXT,
    office              TEXT,
    reason              TEXT,
    legal_basis         TEXT,
    channel             TEXT,
    remedy_key          TEXT,
    visibility          TEXT NOT NULL DEFAULT 'private',
    name_withheld       INTEGER NOT NULL DEFAULT 0,
    supporters          INTEGER NOT NULL DEFAULT 1,
    target              INTEGER,
    status              TEXT NOT NULL DEFAULT 'open',
    escalates_to        TEXT,
    recurrence          INTEGER NOT NULL DEFAULT 1,
    filed_on            TEXT NOT NULL,
    officer_responded_on TEXT,
    officer_atr         TEXT,
    confirmed_on        TEXT,
    confirmed_by        INTEGER NOT NULL DEFAULT 0,
    asks_json           TEXT,
    answers_json        TEXT,
    phone               TEXT,
    seeded              INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS people (
    phone      TEXT PRIMARY KEY,
    name       TEXT,
    created_on TEXT NOT NULL,
    updated_on TEXT
  );

  CREATE TABLE IF NOT EXISTS signatures (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id  INTEGER NOT NULL,
    phone    TEXT NOT NULL,
    note     TEXT,
    added_on TEXT NOT NULL,
    UNIQUE (case_id, phone)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id  INTEGER NOT NULL,
    role     TEXT NOT NULL,
    phone    TEXT,
    text     TEXT NOT NULL,
    added_on TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS confirmations (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id  INTEGER NOT NULL,
    phone    TEXT NOT NULL,
    verdict  TEXT NOT NULL,
    added_on TEXT NOT NULL,
    UNIQUE (case_id, phone)
  );

  CREATE INDEX IF NOT EXISTS idx_cases_cell   ON cases (cell);
  CREATE INDEX IF NOT EXISTS idx_cases_domain ON cases (domain);
  CREATE INDEX IF NOT EXISTS idx_cases_phone  ON cases (phone);
`);

/* ---------- seeding ---------- */

function seedCases({ force = false } = {}) {
  if (force) {
    /* the child rows hang off seeded cases and would otherwise be orphaned on a reseed */
    const ids = db.prepare('SELECT id FROM cases WHERE seeded = 1').all().map((r) => r.id);
    if (ids.length) {
      const list = ids.join(',');
      db.prepare('DELETE FROM signatures WHERE case_id IN (' + list + ')').run();
      db.prepare('DELETE FROM messages WHERE case_id IN (' + list + ')').run();
      db.prepare('DELETE FROM confirmations WHERE case_id IN (' + list + ')').run();
    }
    db.prepare('DELETE FROM cases WHERE seeded = 1').run();
  }
  const existing = db.prepare('SELECT COUNT(*) AS n FROM cases WHERE seeded = 1').get().n;
  if (existing > 0) return existing;

  const insert = db.prepare(`
    INSERT INTO cases (code, domain, option_key, title, summary, area, state, cell, office,
                       reason, legal_basis, channel, remedy_key,
                       visibility, supporters, target, status, escalates_to, recurrence,
                       filed_on, officer_responded_on, officer_atr, confirmed_on, confirmed_by,
                       asks_json, answers_json, phone, seeded)
    VALUES (@code, @domain, @option_key, @title, @summary, @area, @state, @cell, @office,
            @reason, @legal_basis, @channel, @remedy_key,
            @visibility, @supporters, @target, @status, @escalates_to, @recurrence,
            @filed_on, @officer_responded_on, @officer_atr, @confirmed_on, @confirmed_by,
            @asks_json, @answers_json, @phone, 1)
  `);

  const tx = db.transaction((rows) => {
    for (const c of rows) {
      insert.run({
        code: c.code,
        domain: c.domain,
        option_key: c.option_key ?? null,
        title: c.title,
        summary: c.summary ?? null,
        area: c.area ?? null,
        state: c.state ?? null,
        cell: c.cell ?? null,
        office: c.office ?? null,
        visibility: c.visibility ?? 'public',
        supporters: c.supporters ?? 1,
        target: c.target ?? null,
        status: c.status ?? 'open',
        escalates_to: c.escalates_to ?? null,
        recurrence: c.recurrence ?? 1,
        filed_on: c.filed_on,
        officer_responded_on: c.officer_responded_on ?? null,
        confirmed_on: c.confirmed_on ?? null,
        confirmed_by: c.confirmed_by ?? 0,
        reason: c.reason ?? null,
        legal_basis: c.legal_basis ?? null,
        channel: c.channel ?? null,
        remedy_key: c.remedy_key ?? null,
        officer_atr: c.officer_atr ?? null,
        asks_json: JSON.stringify(c.asks ?? []),
        answers_json: JSON.stringify(c.answers ?? []),
        phone: c.phone ?? null
      });
      seedChildren(c);
    }
  });
  tx(seed.cases);
  return seed.cases.length;
}

/* The history behind a seeded case: who signed it, what was said on it, who confirmed it.
   Written from the case's own fields so the numbers on screen are the length of a real list
   rather than a decorative integer. */
/* Prepared once, held for the life of the process. Created inside the per-case call, these
   produced roughly a hundred and thirty Statement objects per cold start, and every one of them
   is a destructor that removes a cleanup hook from the Node environment. On a serverless instance
   that environment can be gone before the destructor runs; the assertion inside
   RemoveEnvironmentCleanupHook then fails and aborts the process, which is what the Vercel logs
   were showing. Five statements, referenced, is not a cure for that mismatch but it is a great
   deal less of it. */
const SEED_STMT = {};
function seedStmt(name, sql) {
  if (!SEED_STMT[name]) SEED_STMT[name] = db.prepare(sql);
  return SEED_STMT[name];
}

function seedChildren(c) {
  const row = seedStmt('findCase', 'SELECT id FROM cases WHERE code = ?').get(c.code);
  if (!row) return;

  /* Signatures. A public case claiming 34 households gets 34 signature rows, each against a
     distinct synthetic mobile, so the joinder rule is exercised by the seed itself and the count
     cannot drift from the list. */
  if (c.visibility !== 'private' && (c.supporters || 0) > 0) {
    const sig = seedStmt('sig',
      'INSERT OR IGNORE INTO signatures (case_id, phone, note, added_on) VALUES (?, ?, ?, ?)');
    const base = 7000000000 + (row.id * 1000);
    for (let i = 0; i < c.supporters; i++) {
      sig.run(row.id, String(base + i), i === 0 ? (c.summary ?? null) : null, c.filed_on);
    }
    if (c.phone) sig.run(row.id, c.phone, null, c.filed_on);
  }

  if (Array.isArray(c.messages)) {
    const msg = seedStmt('msg',
      'INSERT INTO messages (case_id, role, phone, text, added_on) VALUES (?, ?, ?, ?, ?)');
    for (const m of c.messages) {
      msg.run(row.id, m.role || 'citizen', m.role === 'officer' ? null : (c.phone ?? null),
              m.text, m.on || c.filed_on);
    }
  }

  /* Only a confirmation can close a case, so a seeded confirmed_fixed case must carry them or
     the record contradicts the one rule the product rests on. */
  if (Array.isArray(c.confirmations)) {
    const conf = seedStmt('conf',
      'INSERT OR IGNORE INTO confirmations (case_id, phone, verdict, added_on) VALUES (?, ?, ?, ?)');
    for (const k of c.confirmations) {
      conf.run(row.id, String(k.phone), k.verdict || 'fixed', k.on || c.confirmed_on || c.filed_on);
    }
  }

  if (c.phone && c.citizen_name) {
    seedStmt('person', `INSERT INTO people (phone, name, created_on) VALUES (?, ?, ?)
                        ON CONFLICT(phone) DO UPDATE SET name = COALESCE(people.name, excluded.name)`)
      .run(c.phone, c.citizen_name, c.filed_on);
  }
}

/* ---------- helpers ---------- */

const today = () => new Date().toISOString().slice(0, 10);

function daysBetween(fromISO, toISO = today()) {
  const a = new Date(fromISO + 'T00:00:00Z').getTime();
  const b = new Date(toISO + 'T00:00:00Z').getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

function nextCode() {
  const row = db.prepare("SELECT COUNT(*) AS n FROM cases").get();
  const year = new Date().getFullYear();
  return `EA-${year}-${String(60000 + row.n + 1).slice(-5)}`;
}

export function shape(row) {
  if (!row) return null;
  const age = daysBetween(row.filed_on);
  return {
    code: row.code,
    domain: row.domain,
    optionKey: row.option_key,
    title: row.title,
    summary: row.summary,
    area: row.area,
    state: row.state,
    office: row.office,
    reason: row.reason,
    legalBasis: row.legal_basis,
    channel: row.channel,
    remedyKey: row.remedy_key,
    visibility: row.visibility,
    nameWithheld: !!row.name_withheld,
    supporters: row.supporters,
    target: row.target,
    status: row.status,
    escalatesTo: row.escalates_to,
    recurrence: row.recurrence,
    filedOn: row.filed_on,
    officerRespondedOn: row.officer_responded_on,
    officerAtr: row.officer_atr,
    confirmedOn: row.confirmed_on,
    confirmedBy: row.confirmed_by,
    asks: JSON.parse(row.asks_json || '[]'),
    answers: JSON.parse(row.answers_json || '[]'),
    ageDays: age,
    /* Capping the day count at 21 made a case filed five months ago read "Day 21 of 21" —
       a number that says the clock is nearly up when it ran out long ago. That is exactly the
       kind of tidy, wrong figure this product exists to argue against, so an expired clock
       says by how much it expired rather than pretending to still be running. */
    clock: row.status === 'confirmed_fixed' ? null
      : age > 21 ? `${age - 21} days past the 21-day limit`
      : `Day ${age + 1} of 21`,
    overdue: row.status !== 'confirmed_fixed' && age > 21,
    seeded: !!row.seeded
  };
}

/* ---------- queries ---------- */

export function findByCode(input) {
  const digits = String(input || '').replace(/\D/g, '');
  if (digits.length < 4) return null;
  const rows = db.prepare('SELECT * FROM cases').all();
  const hit = rows.find((r) => {
    const rd = r.code.replace(/\D/g, '');
    return rd === digits || rd.endsWith(digits) || digits.endsWith(rd.slice(-5));
  });
  return shape(hit);
}

export function publicCases({ state = null, limit = 60 } = {}) {
  const sql = state
    ? 'SELECT * FROM cases WHERE visibility != ? AND state = ? ORDER BY supporters DESC, filed_on DESC, id DESC LIMIT ?'
    : 'SELECT * FROM cases WHERE visibility != ? ORDER BY supporters DESC, filed_on DESC, id DESC LIMIT ?';
  const rows = state
    ? db.prepare(sql).all('private', state, limit)
    : db.prepare(sql).all('private', limit);
  return rows.map(shape);
}

/** Joinder match: same dedup cell, or same domain in the same area. Public cases only. */
export function findMatch({ domain, cell, area, state }) {
  if (cell) {
    const byCell = db.prepare(
      "SELECT * FROM cases WHERE cell = ? AND visibility != 'private' AND status != 'confirmed_fixed' LIMIT 1"
    ).get(cell);
    if (byCell) return shape(byCell);
  }
  if (domain && (area || state)) {
    const byArea = db.prepare(
      "SELECT * FROM cases WHERE domain = ? AND visibility != 'private' AND status != 'confirmed_fixed'" +
      ' AND (LOWER(COALESCE(area, ?)) LIKE ? OR LOWER(COALESCE(state, ?)) = ?) LIMIT 1'
    ).get(domain, '', `%${String(area || '').toLowerCase().split(',')[0].trim()}%`, '', String(state || '').toLowerCase());
    if (byArea) return shape(byArea);
  }
  return null;
}

export function createCase(data) {
  const code = nextCode();
  db.prepare(`
    INSERT INTO cases (code, domain, option_key, title, summary, area, state, cell, office,
                       reason, legal_basis, channel, remedy_key, visibility, name_withheld,
                       supporters, target, status, escalates_to, recurrence, filed_on,
                       asks_json, answers_json, phone, seeded)
    VALUES (@code, @domain, @option_key, @title, @summary, @area, @state, @cell, @office,
            @reason, @legal_basis, @channel, @remedy_key, @visibility, @name_withheld,
            1, @target, 'open', @escalates_to, @recurrence, @filed_on,
            @asks_json, @answers_json, @phone, 0)
  `).run({
    code,
    domain: data.domain || 'other',
    option_key: data.optionKey ?? null,
    title: data.title || 'Untitled report',
    summary: data.summary ?? null,
    area: data.area ?? null,
    state: (data.state || '').toLowerCase() || null,
    cell: data.cell ?? null,
    office: data.office ?? null,
    reason: data.reason ?? null,
    legal_basis: data.legalBasis ?? null,
    channel: data.channel ?? null,
    remedy_key: data.remedyKey ?? null,
    visibility: data.visibility || 'private',
    name_withheld: data.nameWithheld ? 1 : 0,
    target: data.target ?? (data.visibility === 'public' ? 50 : null),
    escalates_to: data.escalatesTo ?? null,
    recurrence: countRecurrence(data.cell),
    filed_on: today(),
    asks_json: JSON.stringify(data.asks || []),
    answers_json: JSON.stringify(data.answers || []),
    phone: data.phone ?? null
  });
  if (data.phone) {
    try {
      db.prepare('INSERT INTO signatures (case_id, phone, note, added_on) VALUES ((SELECT id FROM cases WHERE code = ?), ?, ?, ?)')
        .run(code, data.phone, null, today());
    } catch { /* first filer already counted in supporters */ }
  }
  return findByCode(code);
}

function countRecurrence(cell) {
  if (!cell) return 1;
  const n = db.prepare('SELECT COUNT(*) AS n FROM cases WHERE cell = ?').get(cell).n;
  return n + 1;
}

/** One signature per verified mobile per case. Returns { case, already }. */
export function addSignature(code, phone, note) {
  const row = db.prepare('SELECT * FROM cases WHERE code = ?').get(findByCode(code)?.code || code);
  if (!row) return { error: 'not_found' };
  if (row.visibility === 'private') return { error: 'not_joinable' };

  const existing = db.prepare('SELECT 1 FROM signatures WHERE case_id = ? AND phone = ?').get(row.id, phone);
  if (existing) return { case: shape(row), already: true };

  db.prepare('INSERT INTO signatures (case_id, phone, note, added_on) VALUES (?, ?, ?, ?)')
    .run(row.id, phone, note || null, today());
  db.prepare('UPDATE cases SET supporters = supporters + 1 WHERE id = ?').run(row.id);

  const updated = db.prepare('SELECT * FROM cases WHERE id = ?').get(row.id);
  const escalated = updated.target && updated.supporters >= updated.target;
  if (escalated && updated.status === 'open') {
    db.prepare("UPDATE cases SET status = 'escalated' WHERE id = ?").run(row.id);
  }
  return { case: shape(db.prepare('SELECT * FROM cases WHERE id = ?').get(row.id)), already: false, escalated };
}

/** Citizen-confirmed closure. An officer report never closes a case. */
export function confirmCase(code, phone, verdict) {
  const found = findByCode(code);
  if (!found) return { error: 'not_found' };
  const row = db.prepare('SELECT * FROM cases WHERE code = ?').get(found.code);

  try {
    db.prepare('INSERT INTO confirmations (case_id, phone, verdict, added_on) VALUES (?, ?, ?, ?)')
      .run(row.id, phone, verdict, today());
  } catch {
    db.prepare('UPDATE confirmations SET verdict = ?, added_on = ? WHERE case_id = ? AND phone = ?')
      .run(verdict, today(), row.id, phone);
  }

  const yes = db.prepare("SELECT COUNT(*) AS n FROM confirmations WHERE case_id = ? AND verdict = 'fixed'").get(row.id).n;
  const needed = row.visibility === 'private' ? 1 : 2;

  if (verdict === 'fixed' && yes >= needed) {
    db.prepare("UPDATE cases SET status = 'confirmed_fixed', confirmed_on = ?, confirmed_by = ? WHERE id = ?")
      .run(today(), yes, row.id);
  } else if (verdict === 'not_fixed') {
    db.prepare("UPDATE cases SET status = 'reopened', confirmed_on = NULL, recurrence = recurrence + 1 WHERE id = ?")
      .run(row.id);
  } else if (verdict === 'partly') {
    db.prepare("UPDATE cases SET status = 'partly_fixed' WHERE id = ?").run(row.id);
  } else {
    db.prepare("UPDATE cases SET confirmed_by = ? WHERE id = ?").run(yes, row.id);
  }

  return { case: findByCode(found.code), confirmations: yes, needed };
}

/** Simulated officer action, so the closure gate can be demonstrated. Clearly mocked. */
export function simulateOfficerReply(code, atr) {
  const found = findByCode(code);
  if (!found) return { error: 'not_found' };
  db.prepare("UPDATE cases SET status = 'awaiting_confirmation', officer_responded_on = ?, officer_atr = ? WHERE code = ?")
    .run(today(), atr, found.code);
  return { case: findByCode(found.code) };
}

export function myCases(phone) {
  const filed = db.prepare('SELECT * FROM cases WHERE phone = ? ORDER BY id DESC').all(phone).map(shape);
  const joined = db.prepare(`
    SELECT c.* FROM cases c
    JOIN signatures s ON s.case_id = c.id
    WHERE s.phone = ? AND (c.phone IS NULL OR c.phone != ?)
    ORDER BY c.id DESC
  `).all(phone, phone).map(shape);
  return { filed, joined };
}

export function dashboard() {
  const openPublic = db.prepare("SELECT COUNT(*) AS n FROM cases WHERE visibility != 'private' AND status NOT IN ('confirmed_fixed')").get().n;
  const fixed = db.prepare("SELECT COUNT(*) AS n FROM cases WHERE status = 'confirmed_fixed'").get().n;
  const recurring = db.prepare('SELECT code, title, area, recurrence FROM cases WHERE recurrence > 1 ORDER BY recurrence DESC LIMIT 5').all();
  const byDomain = db.prepare('SELECT domain, COUNT(*) AS n, SUM(supporters) AS supporters FROM cases GROUP BY domain ORDER BY n DESC').all();
  return {
    openPublic,
    fixed,
    recurring,
    byDomain,
    darpg: stats,
    medianDaysByDomain: stats.median_days_by_domain
  };
}

const reseed = process.argv.includes('--reseed');
const n = seedCases({ force: reseed });
if (reseed) {
  console.log(`Reseeded ${n} cases into ${DB_PATH}`);
  process.exit(0);
}

export default db;


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
  const clean = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!clean) return { error: 'empty' };
  db.prepare(`INSERT INTO people (phone, name, created_on, updated_on) VALUES (?, ?, ?, ?)
              ON CONFLICT(phone) DO UPDATE SET name = excluded.name, updated_on = excluded.updated_on`)
    .run(phone, clean, today(), today());
  return getPerson(phone);
}

/** Everything we know, and where each part of it came from. Derived, never stored twice. */
export function profile(phone) {
  const person = getPerson(phone);
  const filed = db.prepare('SELECT * FROM cases WHERE phone = ? ORDER BY id').all(phone).map(shape);
  const signed = db.prepare(
    `SELECT c.code, c.title, c.area, s.added_on, s.note FROM cases c
       JOIN signatures s ON s.case_id = c.id
      WHERE s.phone = ? AND (c.phone IS NULL OR c.phone != ?)
      ORDER BY s.id`
  ).all(phone, phone);

  /* Keep the first sighting of each fact and remember which case carried it, so a repeated
     answer does not read as two separate pieces of knowledge. */
  const seen = new Map();
  const remember = (kind, label, value, source) => {
    const v = String(value == null ? '' : value).trim();
    if (!v || v.toLowerCase() === 'none attached') return;
    const key = kind + '|' + v.toLowerCase();
    if (seen.has(key)) { seen.get(key).also.push(source); return; }
    seen.set(key, { kind, label, value: v, from: source, also: [] });
  };

  for (const c of filed) {
    if (c.area) remember('place', 'Where you reported from', c.area, c.code);
    if (c.state) remember('place', 'State', titleCase(c.state), c.code);
    if (c.office) remember('office', 'An office your case reached', c.office, c.code);

    /* answers_json keys are positional (ask0, ask1); the question text lives in asks_json */
    const asks = c.asks || [];
    for (const { q, a } of (c.answers || [])) {
      if (!q || q === 'evidence') continue;
      const m = /^ask(\d+)$/.exec(q);
      /* Some keys are already the question ("Which bank"); the rest are slugs. */
      const label = m ? (asks[+m[1]]?.q || 'Something you told us')
                      : (/[ ?]/.test(q) ? q : titleCase(q));
      if (q === 'grievance' || q === 'location') continue;   /* already covered above / too long */
      remember('said', label, a, c.code);
    }
  }

  /* A fact repeated across sixteen grievances should read as one fact seen sixteen times,
     not as sixteen case numbers. */
  const facts = [...seen.values()].map((f) => ({
    kind: f.kind, label: f.label, value: f.value, from: f.from,
    alsoCount: f.also.length, alsoSample: f.also.slice(0, 2)
  }));
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
    supported: signed.map((s) => ({ code: s.code, title: s.title, area: s.area || null, on: s.added_on, note: s.note || null }))
  };
}

function titleCase(s) {
  return String(s || '').replace(/\b\w/g, (c) => c.toUpperCase());
}


/* ---------- the case record ---------- */

/** A citizen answering back. If the case was waiting on them it returns to the office. */
function daysSince(iso) {
  if (!iso) return 0;
  const then = new Date(iso + 'T00:00:00');
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / 86400000));
}

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
       row.target ? 'At ' + row.target + ' names it goes to the ' + (row.escalates_to || 'District Collector') + ' on its own.'
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
