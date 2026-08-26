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
const DB_PATH = process.env.DB_PATH || path.join(ROOT, 'data', 'ekawaaz.db');

export const routing = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'routing.json'), 'utf8'));
export const remedies = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'remedies.json'), 'utf8'));
const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed.json'), 'utf8'));

export const stats = seed.stats;

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

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

  CREATE TABLE IF NOT EXISTS signatures (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id  INTEGER NOT NULL,
    phone    TEXT NOT NULL,
    note     TEXT,
    added_on TEXT NOT NULL,
    UNIQUE (case_id, phone)
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
  if (force) db.prepare('DELETE FROM cases WHERE seeded = 1').run();
  const existing = db.prepare('SELECT COUNT(*) AS n FROM cases WHERE seeded = 1').get().n;
  if (existing > 0) return existing;

  const insert = db.prepare(`
    INSERT INTO cases (code, domain, option_key, title, summary, area, state, cell, office,
                       visibility, supporters, target, status, escalates_to, recurrence,
                       filed_on, officer_responded_on, confirmed_on, confirmed_by,
                       asks_json, seeded)
    VALUES (@code, @domain, @option_key, @title, @summary, @area, @state, @cell, @office,
            @visibility, @supporters, @target, @status, @escalates_to, @recurrence,
            @filed_on, @officer_responded_on, @confirmed_on, @confirmed_by,
            @asks_json, 1)
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
        asks_json: JSON.stringify(c.asks ?? [])
      });
    }
  });
  tx(seed.cases);
  return seed.cases.length;
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
    clock: row.status === 'confirmed_fixed' ? null : `Day ${Math.min(age + 1, 21)} of 21`,
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

export function publicCases({ state = null, limit = 20 } = {}) {
  const sql = state
    ? 'SELECT * FROM cases WHERE visibility != ? AND state = ? ORDER BY supporters DESC LIMIT ?'
    : 'SELECT * FROM cases WHERE visibility != ? ORDER BY supporters DESC LIMIT ?';
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
